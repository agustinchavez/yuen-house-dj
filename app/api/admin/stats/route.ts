import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getIcecastStatus, LIVE_MOUNT, STREAM_MOUNT } from "@/lib/icecast";
import { isLiquidsoapReachable } from "@/lib/liquidsoap";
import { buildWarnings, type BroadcastStats } from "@/lib/broadcast-health";

// GET /api/admin/stats — broadcast health for the admin panel.
export async function GET() {
  const result = await requireAdmin();
  if (!result.authorized) return result.response;

  const now = new Date();

  const [icecast, liquidsoapReachable, statusCounts, onAirShows, nextShow] =
    await Promise.all([
      getIcecastStatus(),
      isLiquidsoapReachable(),
      prisma.show.groupBy({ by: ["status"], _count: true }),
      prisma.show.findMany({
        where: { status: { in: ["LIVE", "BROADCASTING"] } },
        orderBy: { scheduledStart: "asc" },
      }),
      prisma.show.findFirst({
        where: { status: "SCHEDULED", scheduledStart: { gt: now } },
        orderBy: { scheduledStart: "asc" },
      }),
    ]);

  const onAir = onAirShows.map((s) => ({
    id: s.id,
    title: s.title,
    djName: s.djName,
    showType: s.showType,
    status: s.status,
    scheduledEnd: s.scheduledEnd.toISOString(),
  }));

  const payload: BroadcastStats = {
    checkedAt: now.toISOString(),
    icecast,
    liquidsoap: { reachable: liquidsoapReachable },
    mountNames: { live: LIVE_MOUNT, stream: STREAM_MOUNT },
    shows: {
      byStatus: Object.fromEntries(statusCounts.map((s) => [s.status, s._count])),
      onAir,
      next: nextShow
        ? {
            id: nextShow.id,
            title: nextShow.title,
            djName: nextShow.djName,
            showType: nextShow.showType,
            scheduledStart: nextShow.scheduledStart.toISOString(),
          }
        : null,
    },
    warnings: buildWarnings({
      icecast,
      liquidsoapReachable,
      onAir,
      liveMount: LIVE_MOUNT,
      streamMount: STREAM_MOUNT,
    }),
  };

  return NextResponse.json(payload);
}
