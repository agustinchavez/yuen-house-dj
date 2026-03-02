import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { queueFile } from "@/lib/liquidsoap";

// POST /api/liquidsoap/queue — Admin only. Manually queue a show file.
export async function POST(req: NextRequest) {
  const result = await requireAdmin();
  if (!result.authorized) return result.response;

  const body = await req.json();
  const { filePath } = body;

  if (!filePath || typeof filePath !== "string") {
    return NextResponse.json(
      { error: "filePath is required" },
      { status: 400 }
    );
  }

  try {
    const response = await queueFile(filePath);
    return NextResponse.json({ success: true, liquidsoapResponse: response });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to queue file in Liquidsoap", details: String(err) },
      { status: 500 }
    );
  }
}
