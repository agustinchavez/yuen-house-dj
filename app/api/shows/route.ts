import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { ShowStatus } from "@/app/generated/prisma";

// GET /api/shows — DJ: own shows. Admin: all shows. Supports ?status= filter.
export async function GET(req: NextRequest) {
  const result = await requireAuth();
  if (!result.authorized) return result.response;

  const statusParam = req.nextUrl.searchParams.get("status");
  const statusFilter = statusParam
    ? { status: statusParam.toUpperCase() as ShowStatus }
    : {};

  const where = result.isAdmin
    ? statusFilter
    : { djEmail: result.email, ...statusFilter };

  const shows = await prisma.show.findMany({
    where,
    orderBy: { scheduledStart: "asc" },
  });

  return NextResponse.json(shows);
}

// POST /api/shows — Create a show request. Status auto-set to PENDING_APPROVAL.
export async function POST(req: NextRequest) {
  const result = await requireAuth();
  if (!result.authorized) return result.response;

  const body = await req.json();
  const { title, description, showType, scheduledStart, scheduledEnd, audioFilePath, audioDurationSec } = body;

  if (!title || !showType || !scheduledStart || !scheduledEnd) {
    return NextResponse.json(
      { error: "Missing required fields: title, showType, scheduledStart, scheduledEnd" },
      { status: 400 }
    );
  }

  const start = new Date(scheduledStart);
  const end = new Date(scheduledEnd);

  if (end <= start) {
    return NextResponse.json(
      { error: "scheduledEnd must be after scheduledStart" },
      { status: 400 }
    );
  }

  // Conflict check: does this slot overlap any already-approved show?
  const conflict = await prisma.show.findFirst({
    where: {
      status: "SCHEDULED",
      scheduledStart: { lt: end },
      scheduledEnd: { gt: start },
    },
  });

  if (conflict) {
    return NextResponse.json(
      { error: "This time slot conflicts with an already-scheduled show", conflictWith: conflict.id },
      { status: 409 }
    );
  }

  // Get DJ display name
  const dj = await prisma.dJAllowlist.findUnique({
    where: { email: result.email },
  });

  // Admin requests auto-approve
  const status = result.isAdmin ? "SCHEDULED" : "PENDING_APPROVAL";

  const show = await prisma.show.create({
    data: {
      djEmail: result.email,
      djName: dj?.displayName ?? result.email,
      title,
      description: description ?? null,
      showType,
      status,
      scheduledStart: start,
      scheduledEnd: end,
      audioFilePath: audioFilePath ?? null,
      audioDurationSec: audioDurationSec ?? null,
      approvedByEmail: result.isAdmin ? result.email : null,
      approvedAt: result.isAdmin ? new Date() : null,
    },
  });

  return NextResponse.json(show, { status: 201 });
}
