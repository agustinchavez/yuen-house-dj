import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { readFile, stat } from "fs/promises";

// GET /api/shows/audio/[id] — Stream the audio file for a show.
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

  // Only the show's DJ or an admin can listen
  if (show.djEmail !== result.email && !result.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!show.audioFilePath) {
    return NextResponse.json({ error: "No audio file for this show" }, { status: 404 });
  }

  try {
    await stat(show.audioFilePath);
  } catch {
    return NextResponse.json({ error: "Audio file not found on disk" }, { status: 404 });
  }

  const data = await readFile(show.audioFilePath);
  const ext = show.audioFilePath.split(".").pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    mp3: "audio/mpeg",
    wav: "audio/wav",
    flac: "audio/flac",
    aac: "audio/aac",
    ogg: "audio/ogg",
    m4a: "audio/mp4",
  };

  return new NextResponse(data, {
    headers: {
      "Content-Type": mimeMap[ext || ""] || "audio/mpeg",
      "Content-Length": String(data.length),
    },
  });
}
