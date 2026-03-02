import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getIcecastStatus } from "@/lib/icecast";

// GET /api/icecast/status — Fetches Icecast stats.
export async function GET() {
  const result = await requireAuth();
  if (!result.authorized) return result.response;

  const status = await getIcecastStatus();

  return NextResponse.json(status);
}
