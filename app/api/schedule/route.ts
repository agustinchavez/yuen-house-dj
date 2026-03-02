import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/schedule — PUBLIC, no auth. Returns approved shows for next 14 days.
export async function GET() {
  const now = new Date();
  const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const shows = await prisma.show.findMany({
    where: {
      status: { in: ["SCHEDULED", "LIVE", "BROADCASTING"] },
      scheduledStart: { gte: now, lte: twoWeeks },
    },
    select: {
      id: true,
      djName: true,
      title: true,
      description: true,
      showType: true,
      status: true,
      scheduledStart: true,
      scheduledEnd: true,
    },
    orderBy: { scheduledStart: "asc" },
  });

  return NextResponse.json(shows);
}
