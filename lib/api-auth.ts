import { NextResponse } from "next/server";
import { auth } from "./auth";
import { prisma } from "./prisma";

export type AuthResult =
  | { authorized: false; response: NextResponse }
  | { authorized: true; email: string; isAdmin: boolean };

export async function requireAuth(): Promise<AuthResult> {
  const session = await auth();
  if (!session?.user?.email) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const dj = await prisma.dJAllowlist.findUnique({
    where: { email: session.user.email },
  });

  if (!dj) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Not on allowlist" }, { status: 403 }),
    };
  }

  return { authorized: true, email: dj.email, isAdmin: dj.isAdmin };
}

export async function requireAdmin(): Promise<AuthResult> {
  const result = await requireAuth();
  if (!result.authorized) return result;

  if (!result.isAdmin) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Admin access required" }, { status: 403 }),
    };
  }

  return result;
}
