import net from "net";

const LIQUIDSOAP_HOST = process.env.LIQUIDSOAP_HOST || "127.0.0.1";
const LIQUIDSOAP_PORT = parseInt(process.env.LIQUIDSOAP_PORT || "1234", 10);

// Must match the `request.queue(id=...)` in infra/liquidsoap/radio.liq. The
// queue id IS the telnet command prefix, so a mismatch does not error at
// startup - it fails at air time as "unknown command".
const LIQUIDSOAP_QUEUE = process.env.LIQUIDSOAP_QUEUE || "scheduled";

const COMMAND_TIMEOUT_MS = 5000;

/**
 * Send one command over Liquidsoap's telnet interface and return its response.
 * Every response is terminated by a line containing just `END`.
 */
export function sendLiquidsoapCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let response = "";
    let settled = false;

    const settle = (action: () => void) => {
      if (settled) return;
      settled = true;
      client.destroy();
      action();
    };

    const body = () => response.replace(/^END$/m, "").trim();
    const isComplete = () => /^END$/m.test(response);

    client.setTimeout(COMMAND_TIMEOUT_MS);

    client.connect(LIQUIDSOAP_PORT, LIQUIDSOAP_HOST, () => {
      client.write(command + "\n");
    });

    client.on("data", (chunk) => {
      response += chunk.toString();
      if (isComplete()) settle(() => resolve(body()));
    });

    client.on("timeout", () =>
      settle(() =>
        reject(new Error(`Liquidsoap did not respond within ${COMMAND_TIMEOUT_MS}ms`))
      )
    );

    client.on("error", (err) => settle(() => reject(err)));

    // Closing before END means the command was cut off, not that it succeeded
    client.on("close", () =>
      settle(() =>
        isComplete()
          ? resolve(body())
          : reject(new Error("Liquidsoap closed the connection before responding"))
      )
    );
  });
}

/**
 * Push a file into the scheduled-show queue so it airs next.
 * Returns Liquidsoap's numeric request id.
 */
export async function queueFile(filePath: string): Promise<string> {
  const response = await sendLiquidsoapCommand(`${LIQUIDSOAP_QUEUE}.push ${filePath}`);

  // A successful push responds with just the request id. Anything else - most
  // likely "ERROR: unknown command" - means this queue name and the one in
  // radio.liq disagree, so fail loudly rather than recording a bogus id.
  const requestId = response.split(/\s+/)[0] ?? "";
  if (!/^\d+$/.test(requestId)) {
    throw new Error(
      `Liquidsoap rejected "${LIQUIDSOAP_QUEUE}.push": ${response || "empty response"}`
    );
  }

  return requestId;
}

/** True if Liquidsoap is reachable at all - used by health checks. */
export async function isLiquidsoapReachable(): Promise<boolean> {
  try {
    await sendLiquidsoapCommand("version");
    return true;
  } catch {
    return false;
  }
}
