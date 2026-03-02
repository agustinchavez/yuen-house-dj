import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

// DELETE /api/admin/allowlist/[email] — Remove an email from the allowlist.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  const result = await requireAdmin();
  if (!result.authorized) return result.response;

  const { email } = await params;
  const decoded = decodeURIComponent(email);

  const dj = await prisma.dJAllowlist.findUnique({
    where: { email: decoded },
  });

  if (!dj) {
    return NextResponse.json({ error: "Email not found on allowlist" }, { status: 404 });
  }

  // Cannot remove yourself
  if (decoded === result.email) {
    return NextResponse.json(
      { error: "Cannot remove yourself from the allowlist" },
      { status: 400 }
    );
  }

  await prisma.dJAllowlist.delete({ where: { email: decoded } });

  return NextResponse.json({ success: true, removed: decoded });
}

// PATCH /api/admin/allowlist/[email] — Update a DJ (toggle isAdmin, reset password).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  const result = await requireAdmin();
  if (!result.authorized) return result.response;

  const { email } = await params;
  const decoded = decodeURIComponent(email);

  const dj = await prisma.dJAllowlist.findUnique({
    where: { email: decoded },
  });

  if (!dj) {
    return NextResponse.json({ error: "Email not found on allowlist" }, { status: 404 });
  }

  const body = await req.json();
  const data: { isAdmin?: boolean; passwordHash?: string } = {};

  // Handle isAdmin change (cannot change your own)
  if (typeof body.isAdmin === "boolean") {
    if (decoded === result.email) {
      return NextResponse.json(
        { error: "Cannot change your own admin status" },
        { status: 400 }
      );
    }
    data.isAdmin = body.isAdmin;
  }

  // Handle password reset
  if (typeof body.newPassword === "string" && body.newPassword.length > 0) {
    if (body.newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }
    data.passwordHash = await bcrypt.hash(body.newPassword, 12);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No changes provided." }, { status: 400 });
  }

  const updated = await prisma.dJAllowlist.update({
    where: { email: decoded },
    data,
  });

  return NextResponse.json(updated);
}
