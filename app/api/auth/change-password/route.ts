import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

// POST /api/auth/change-password — Change the authenticated user's password.
export async function POST(req: NextRequest) {
  const result = await requireAuth();
  if (!result.authorized) return result.response;

  const body = await req.json();
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Current password and new password are required." },
      { status: 400 }
    );
  }

  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: "New password must be at least 6 characters." },
      { status: 400 }
    );
  }

  const dj = await prisma.dJAllowlist.findUnique({
    where: { email: result.email },
  });

  if (!dj || !dj.passwordHash) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const valid = await bcrypt.compare(currentPassword, dj.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: "Current password is incorrect." },
      { status: 403 }
    );
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.dJAllowlist.update({
    where: { email: result.email },
    data: { passwordHash: hash },
  });

  return NextResponse.json({ success: true });
}
