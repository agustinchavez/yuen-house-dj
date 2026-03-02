import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

// GET /api/admin/approvals — Returns all PENDING_APPROVAL shows.
export async function GET() {
  const result = await requireAdmin();
  if (!result.authorized) return result.response;

  const pending = await prisma.show.findMany({
    where: { status: "PENDING_APPROVAL" },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(pending);
}
