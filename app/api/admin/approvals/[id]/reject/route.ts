import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { sendShowRejectedEmail } from "@/lib/email";

// POST /api/admin/approvals/[id]/reject — Reject a show. Required body: { note }.
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

  const body = await req.json();

  if (!body.note || typeof body.note !== "string" || !body.note.trim()) {
    return NextResponse.json(
      { error: "A rejection note is required" },
      { status: 400 }
    );
  }

  const rejected = await prisma.show.update({
    where: { id },
    data: {
      status: "REJECTED",
      adminNote: body.note.trim(),
      approvedByEmail: result.email,
      approvedAt: new Date(),
    },
  });

  // Send notification email (fire-and-forget)
  sendShowRejectedEmail(
    show.djEmail,
    rejected.title,
    rejected.adminNote || body.note.trim()
  ).catch(() => {});

  return NextResponse.json(rejected);
}
