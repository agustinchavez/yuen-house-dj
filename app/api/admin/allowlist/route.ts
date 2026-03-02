import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import bcrypt from "bcryptjs";

// GET /api/admin/allowlist — Returns full DJ allowlist with stats.
export async function GET() {
  const result = await requireAdmin();
  if (!result.authorized) return result.response;

  const allowlist = await prisma.dJAllowlist.findMany({
    orderBy: { addedAt: "desc" },
    include: {
      _count: { select: { shows: true } },
    },
  });

  return NextResponse.json(allowlist);
}

// POST /api/admin/allowlist — Add an email to the allowlist.
export async function POST(req: NextRequest) {
  const result = await requireAdmin();
  if (!result.authorized) return result.response;

  const body = await req.json();
  const { email, password, displayName } = body;

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    return NextResponse.json(
      { error: "Password is required (minimum 6 characters)" },
      { status: 400 }
    );
  }

  const trimmed = email.trim().toLowerCase();

  // Check if already on allowlist
  const existing = await prisma.dJAllowlist.findUnique({
    where: { email: trimmed },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Email is already on the allowlist" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const dj = await prisma.dJAllowlist.create({
    data: {
      email: trimmed,
      passwordHash,
      displayName: displayName?.trim() || null,
      addedByEmail: result.email,
    },
  });

  return NextResponse.json(dj, { status: 201 });
}
