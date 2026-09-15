import cron from "node-cron";
import { prisma } from "./prisma";
import { queueFile } from "./liquidsoap";

// The broadcast scheduler. This is what actually puts approved recorded shows
// on air - without it running, shows sit in SCHEDULED forever and listeners
// only ever hear the automated fallback playlist.
//
// Booted from instrumentation.ts when the Next.js server starts.

const LOOKAHEAD_MS = 60 * 1000;
// If the process was down over a show's start time, still air it if we are
// within this window rather than skipping the slot entirely.
const GRACE_MS = 5 * 60 * 1000;

let started = false;

/** Queue any recorded show whose start time has arrived. */
export async function queueDueShows(now: Date) {
  const shows = await prisma.show.findMany({
    where: {
      status: "SCHEDULED",
      showType: "RECORDED",
      scheduledStart: {
        gte: new Date(now.getTime() - GRACE_MS),
        lte: new Date(now.getTime() + LOOKAHEAD_MS),
      },
      audioFilePath: { not: null },
    },
  });

  for (const show of shows) {
    if (!show.audioFilePath) continue;

    try {
      const requestId = await queueFile(show.audioFilePath);
      await prisma.show.update({
        where: { id: show.id },
        data: { status: "BROADCASTING", liquidsoapRequestId: requestId },
      });
      console.log(`[scheduler] On air: "${show.title}" (${show.id}) req=${requestId}`);
    } catch (err) {
      // Leave the show SCHEDULED so the next tick retries it inside the grace
      // window - a transient Liquidsoap blip should not lose the slot.
      console.error(`[scheduler] Failed to queue show ${show.id}:`, err);
    }
  }
}

/**
 * Close out shows whose slot has passed. Nothing else in the app writes
 * COMPLETED, so without this the history and library pages stay empty forever
 * and the schedule accumulates stale entries.
 */
export async function closeFinishedShows(now: Date) {
  const { count } = await prisma.show.updateMany({
    where: {
      status: { in: ["SCHEDULED", "BROADCASTING", "LIVE"] },
      scheduledEnd: { lt: now },
    },
    data: { status: "COMPLETED" },
  });

  if (count > 0) {
    console.log(`[scheduler] Marked ${count} show(s) COMPLETED`);
  }
}

export function startScheduler() {
  // Next.js can evaluate instrumentation more than once in development; a
  // second cron would double-push every show to air.
  if (started) return;
  started = true;

  cron.schedule("* * * * *", async () => {
    const now = new Date();
    try {
      await queueDueShows(now);
      await closeFinishedShows(now);
    } catch (err) {
      // Never let a throw kill the cron registration
      console.error("[scheduler] Tick failed:", err);
    }
  });

  console.log("[scheduler] Broadcast scheduler started (every minute)");
}
