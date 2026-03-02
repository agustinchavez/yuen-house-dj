import cron from "node-cron";
import { prisma } from "./prisma";
import { queueFile } from "./liquidsoap";

// Checks every minute for recorded shows starting within 60 seconds
export function startScheduler() {
  cron.schedule("* * * * *", async () => {
    const now = new Date();
    const sixtySecondsFromNow = new Date(now.getTime() + 60 * 1000);

    const shows = await prisma.show.findMany({
      where: {
        status: "SCHEDULED",
        showType: "RECORDED",
        scheduledStart: { gte: now, lte: sixtySecondsFromNow },
        audioFilePath: { not: null },
      },
    });

    for (const show of shows) {
      if (!show.audioFilePath) continue;

      try {
        const requestId = await queueFile(show.audioFilePath);
        await prisma.show.update({
          where: { id: show.id },
          data: {
            status: "BROADCASTING",
            liquidsoapRequestId: requestId,
          },
        });
        console.log(`[scheduler] Queued show "${show.title}" (${show.id})`);
      } catch (err) {
        console.error(`[scheduler] Failed to queue show ${show.id}:`, err);
      }
    }
  });

  console.log("[scheduler] Broadcast scheduler started (checking every minute)");
}
