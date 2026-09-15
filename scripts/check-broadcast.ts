/**
 * Broadcast preflight. Run on the server after provisioning, or any time the
 * stream misbehaves:
 *
 *     npm run check:broadcast
 *
 * Every check names the specific thing that is wrong and how to fix it, rather
 * than reporting that "the stream is down". The failure modes this exists to
 * catch are quiet ones: services that are individually healthy but disagree
 * with each other about mount names, queue ids or file paths.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

type Level = "ok" | "warn" | "fail";
const results: { level: Level; label: string; detail: string }[] = [];

const record = (level: Level, label: string, detail: string) =>
  results.push({ level, label, detail });

const env = (k: string, fallback = "") => process.env[k] ?? fallback;

const ICECAST_HOST = env("ICECAST_HOST", "127.0.0.1");
const ICECAST_PORT = env("ICECAST_PORT", "8000");
const ICECAST_ADMIN_PASSWORD = env("ICECAST_ADMIN_PASSWORD");
const STREAM_MOUNT = env("ICECAST_MOUNT", "stream");
const LIVE_MOUNT = env("ICECAST_LIVE_MOUNT", "live");
const LIQUIDSOAP_QUEUE = env("LIQUIDSOAP_QUEUE", "scheduled");
const FALLBACK_DIR = env("FALLBACK_DIR", "./data/fallback");
const UPLOADS_DIR = env("UPLOADS_DIR", "./data/uploads");

const AUDIO_EXT = [".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a"];

async function checkIcecast() {
  if (!ICECAST_ADMIN_PASSWORD) {
    record("fail", "Icecast", "ICECAST_ADMIN_PASSWORD is not set - stats cannot be read.");
    return null;
  }

  const { getIcecastStatus } = await import("../lib/icecast");
  const status = await getIcecastStatus();

  if (!status.reachable) {
    record(
      "fail",
      "Icecast",
      `Unreachable at ${ICECAST_HOST}:${ICECAST_PORT}. Check: systemctl status icecast2`
    );
    return status;
  }

  record("ok", "Icecast", `Reachable at ${ICECAST_HOST}:${ICECAST_PORT}`);

  const names = status.mounts.map((m) => m.mount);

  if (names.includes(STREAM_MOUNT)) {
    record(
      "ok",
      "Stream mount",
      `/${STREAM_MOUNT} is publishing to ${status.listenerCount} listener(s)`
    );
  } else {
    record(
      "fail",
      "Stream mount",
      `Nothing is publishing to /${STREAM_MOUNT}, so listeners hear silence. ` +
        `Icecast sees: ${names.length ? names.map((n) => "/" + n).join(", ") : "no mounts at all"}. ` +
        `Usually means Liquidsoap is not running or is using a different mount name.`
    );
  }

  record(
    "ok",
    "Live input",
    status.liveConnected
      ? `A DJ is connected to /${LIVE_MOUNT}`
      : `No DJ on /${LIVE_MOUNT} (expected when nobody is broadcasting)`
  );

  return status;
}

async function checkLiquidsoap() {
  const { sendLiquidsoapCommand } = await import("../lib/liquidsoap");

  let version: string;
  try {
    version = await sendLiquidsoapCommand("version");
  } catch (err) {
    record(
      "fail",
      "Liquidsoap",
      `Unreachable on ${env("LIQUIDSOAP_HOST", "127.0.0.1")}:${env("LIQUIDSOAP_PORT", "1234")} ` +
        `(${err instanceof Error ? err.message : String(err)}). ` +
        `Recorded shows cannot be queued. Check: systemctl status yuen-liquidsoap`
    );
    return;
  }

  record("ok", "Liquidsoap", version.replace(/\s+/g, " ").trim());

  // The bug this exists to catch: the queue id in radio.liq and the queue name
  // this app pushes to must be identical, and a mismatch is invisible until a
  // show is due to air.
  try {
    const reply = await sendLiquidsoapCommand(`${LIQUIDSOAP_QUEUE}.queue`);
    if (/unknown command/i.test(reply)) {
      record(
        "fail",
        "Queue name",
        `Liquidsoap has no queue called "${LIQUIDSOAP_QUEUE}". Recorded shows will ` +
          `silently fail to air. Make LIQUIDSOAP_QUEUE match request.queue(id=...) ` +
          `in radio.liq.`
      );
    } else {
      record(
        "ok",
        "Queue name",
        `"${LIQUIDSOAP_QUEUE}" exists${reply.trim() ? ` (queued: ${reply.trim()})` : " and is empty"}`
      );
    }
  } catch (err) {
    record("warn", "Queue name", `Could not verify: ${err instanceof Error ? err.message : err}`);
  }
}

function checkDirectory(label: string, dir: string, mustHaveAudio: boolean) {
  const resolved = path.resolve(dir);

  if (!fs.existsSync(resolved)) {
    record("fail", label, `${resolved} does not exist.`);
    return;
  }

  try {
    fs.accessSync(resolved, fs.constants.W_OK);
  } catch {
    record("fail", label, `${resolved} is not writable by this process.`);
    return;
  }

  if (!mustHaveAudio) {
    record("ok", label, resolved);
    return;
  }

  const audio = fs
    .readdirSync(resolved)
    .filter((f) => AUDIO_EXT.includes(path.extname(f).toLowerCase()));

  if (audio.length === 0) {
    record(
      "fail",
      label,
      `${resolved} has no audio files. Unclaimed hours will be SILENCE - ` +
        `drop some tracks in before going live.`
    );
  } else {
    record("ok", label, `${audio.length} track(s) in ${resolved}`);
  }
}

async function checkFfprobe() {
  try {
    const { stdout } = await execFileAsync("ffprobe", ["-version"]);
    record("ok", "ffprobe", stdout.split("\n")[0]);
  } catch {
    record(
      "warn",
      "ffprobe",
      "Not on PATH. Uploads still work, but show durations will not be detected."
    );
  }
}

async function checkDatabase() {
  try {
    const { prisma } = await import("../lib/prisma");
    const [djs, scheduled] = await Promise.all([
      prisma.dJAllowlist.count(),
      prisma.show.count({ where: { status: "SCHEDULED" } }),
    ]);
    record("ok", "Database", `${djs} DJ(s) on the allowlist, ${scheduled} show(s) scheduled`);
    await prisma.$disconnect();
  } catch (err) {
    record("fail", "Database", err instanceof Error ? err.message : String(err));
  }
}

async function main() {
  await checkDatabase();
  await checkIcecast();
  await checkLiquidsoap();
  checkDirectory("Fallback playlist", FALLBACK_DIR, true);
  checkDirectory("Uploads", UPLOADS_DIR, false);
  await checkFfprobe();

  const icon = { ok: "  ok  ", warn: " warn ", fail: " FAIL " };
  console.log("\nBroadcast preflight\n" + "-".repeat(72));
  for (const r of results) {
    console.log(`[${icon[r.level]}] ${r.label.padEnd(18)} ${r.detail}`);
  }

  const failures = results.filter((r) => r.level === "fail");
  const warnings = results.filter((r) => r.level === "warn");
  console.log("-".repeat(72));

  if (failures.length === 0) {
    console.log(
      `All checks passed${warnings.length ? ` (${warnings.length} warning(s))` : ""}.\n`
    );
    return;
  }

  console.log(`${failures.length} check(s) failed:\n`);
  for (const f of failures) console.log(`  - ${f.label}: ${f.detail}`);
  console.log();
  process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
