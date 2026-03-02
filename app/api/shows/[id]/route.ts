import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

// GET /api/shows/[id] — DJ can only fetch own. Admin can fetch any.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (!result.authorized) return result.response;

  const { id } = await params;

  const show = await prisma.show.findUnique({ where: { id } });
  if (!show) {
    return NextResponse.json({ error: "Show not found" }, { status: 404 });
  }

  if (!result.isAdmin && show.djEmail !== result.email) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  return NextResponse.json(show);
}

// PATCH /api/shows/[id] — Edit title/description (DJ, own shows).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (!result.authorized) return result.response;

  const { id } = await params;

  const show = await prisma.show.findUnique({ where: { id } });
  if (!show) {
    return NextResponse.json({ error: "Show not found" }, { status: 404 });
  }

  // DJs can only edit their own shows' title/description
  if (!result.isAdmin && show.djEmail !== result.email) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const body = await req.json();

  if (!result.isAdmin) {
    // DJ can only update title and description on pending/scheduled shows
    if (show.status !== "PENDING_APPROVAL" && show.status !== "SCHEDULED") {
      return NextResponse.json(
        { error: "Can only edit pending or scheduled shows" },
        { status: 400 }
      );
    }

    const updated = await prisma.show.update({
      where: { id },
      data: {
        title: body.title ?? show.title,
        description: body.description !== undefined ? body.description : show.description,
      },
    });
    return NextResponse.json(updated);
  }

  // Admin can update any fields
  const updated = await prisma.show.update({
    where: { id },
    data: body,
  });
  return NextResponse.json(updated);
}

// DELETE /api/shows/[id] — Cancel a show.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (!result.authorized) return result.response;

  const { id } = await params;

  const show = await prisma.show.findUnique({ where: { id } });
  if (!show) {
    return NextResponse.json({ error: "Show not found" }, { status: 404 });
  }

  if (!result.isAdmin) {
    // DJ can only cancel own pending or scheduled shows
    if (show.djEmail !== result.email) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    if (show.status !== "PENDING_APPROVAL" && show.status !== "SCHEDULED") {
      return NextResponse.json(
        { error: "Can only cancel pending or scheduled shows" },
        { status: 400 }
      );
    }
  }

  const cancelled = await prisma.show.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json(cancelled);
}
