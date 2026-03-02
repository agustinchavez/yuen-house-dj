import net from "net";

const LIQUIDSOAP_HOST = process.env.LIQUIDSOAP_HOST || "localhost";
const LIQUIDSOAP_PORT = parseInt(process.env.LIQUIDSOAP_PORT || "1234", 10);

export function sendLiquidsoapCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let response = "";

    client.connect(LIQUIDSOAP_PORT, LIQUIDSOAP_HOST, () => {
      client.write(command + "\n");
    });

    client.on("data", (data) => {
      response += data.toString();
      if (response.includes("END")) {
        client.end();
      }
    });

    client.on("end", () => {
      resolve(response.replace("END", "").trim());
    });

    client.on("error", (err) => {
      reject(err);
    });

    client.setTimeout(5000, () => {
      client.destroy();
      reject(new Error("Liquidsoap connection timed out"));
    });
  });
}

export async function queueFile(filePath: string): Promise<string> {
  const response = await sendLiquidsoapCommand(
    `request.push ${filePath}`
  );
  return response;
}
