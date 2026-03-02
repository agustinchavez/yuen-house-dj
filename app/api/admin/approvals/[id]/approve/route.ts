import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { sendShowApprovedEmail } from "@/lib/email";

// POST /api/admin/approvals/[id]/approve — Approve a show.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin();
  if (!result.authorized) return result.response;

  const { id } = await params;

  const show = await prisma.show.findUnique({ where: { id } });
  if (!show) {
    return NextResponse.json({ error: "Show not found" }, { status: 404 });
  }

  if (show.status !== "PENDING_APPROVAL") {
    return NextResponse.json(
      { error: "Show is not pending approval" },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));

  // Admin can override the scheduled time
  const scheduledStart = body.scheduledStart
    ? new Date(body.scheduledStart)
    : show.scheduledStart;
  const scheduledEnd = body.scheduledEnd
    ? new Date(body.scheduledEnd)
    : show.scheduledEnd;

  // Conflict check against already-scheduled shows
  const conflict = await prisma.show.findFirst({
    where: {
      id: { not: id },
      status: "SCHEDULED",
      scheduledStart: { lt: scheduledEnd },
      scheduledEnd: { gt: scheduledStart },
    },
  });

  if (conflict) {
    return NextResponse.json(
      { error: "Approved time slot conflicts with another scheduled show", conflictWith: conflict.id },
      { status: 409 }
    );
  }

  const approved = await prisma.show.update({
    where: { id },
    data: {
      status: "SCHEDULED",
      scheduledStart,
      scheduledEnd,
      adminNote: body.note ?? null,
      approvedByEmail: result.email,
      approvedAt: new Date(),
    },
  });

  // Send notification email (fire-and-forget)
  sendShowApprovedEmail(
    show.djEmail,
    approved.title,
    approved.scheduledStart,
    approved.adminNote
  ).catch(() => {});

  return NextResponse.json(approved);
}
