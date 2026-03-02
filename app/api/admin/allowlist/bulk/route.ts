import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import bcrypt from "bcryptjs";

// POST /api/admin/allowlist/bulk — Bulk import emails to the allowlist.
// Accepts { emails: string, password: string }
// emails is comma or newline separated list of email addresses.
// All imported DJs get the same initial password.
export async function POST(req: NextRequest) {
  const result = await requireAdmin();
  if (!result.authorized) return result.response;

  const body = await req.json();
  const { emails, password } = body;

  if (!emails || typeof emails !== "string") {
    return NextResponse.json({ error: "Emails list is required" }, { status: 400 });
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    return NextResponse.json(
      { error: "Password is required (minimum 6 characters)" },
      { status: 400 }
    );
  }

  // Parse emails: split by commas, newlines, semicolons, or spaces
  const parsed = emails
    .split(/[,;\n\r\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0 && e.includes("@"));

  if (parsed.length === 0) {
    return NextResponse.json({ error: "No valid emails found" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const results: { email: string; status: "added" | "exists" | "error" }[] = [];

  for (const email of parsed) {
    try {
      const existing = await prisma.dJAllowlist.findUnique({
        where: { email },
      });

      if (existing) {
        results.push({ email, status: "exists" });
        continue;
      }

      await prisma.dJAllowlist.create({
        data: {
          email,
          passwordHash,
          addedByEmail: result.email,
        },
      });

      results.push({ email, status: "added" });
    } catch {
      results.push({ email, status: "error" });
    }
  }

  const added = results.filter((r) => r.status === "added").length;
  const skipped = results.filter((r) => r.status === "exists").length;

  return NextResponse.json({ results, added, skipped, total: parsed.length }, { status: 201 });
}
