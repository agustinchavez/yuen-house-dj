import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";
import {
  FALLBACK_DIR,
  listFallbackTracks,
  sanitizeAudioFilename,
} from "@/lib/fallback";

const MAX_SIZE = 200 * 1024 * 1024; // individual songs, not full shows

// GET /api/admin/fallback — list the 24/7 automated library
export async function GET() {
  const result = await requireAdmin();
  if (!result.authorized) return result.response;

  return NextResponse.json({ tracks: await listFallbackTracks() });
}

// POST /api/admin/fallback — add tracks (multipart, several files at once)
export async function POST(req: NextRequest) {
  const result = await requireAdmin();
  if (!result.authorized) return result.response;

  const formData = await req.formData();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  await mkdir(FALLBACK_DIR, { recursive: true });

  const saved: string[] = [];
  const rejected: { name: string; reason: string }[] = [];

  for (const file of files) {
    const safeName = sanitizeAudioFilename(file.name);
    if (!safeName) {
      rejected.push({ name: file.name, reason: "Not a recognized audio file" });
      continue;
    }
    if (file.size > MAX_SIZE) {
      rejected.push({ name: file.name, reason: "Larger than 200MB" });
      continue;
    }

    await writeFile(
      path.join(FALLBACK_DIR, safeName),
      Buffer.from(await file.arrayBuffer())
    );
    saved.push(safeName);
  }

  return NextResponse.json({ saved, rejected });
}

// DELETE /api/admin/fallback?name=<file> — remove a track from rotation
export async function DELETE(req: NextRequest) {
  const result = await requireAdmin();
  if (!result.authorized) return result.response;

  const raw = new URL(req.url).searchParams.get("name") ?? "";
  const safeName = sanitizeAudioFilename(raw);

  // The name must sanitize to exactly itself: anything else means the caller
  // sent a path or junk, and we refuse rather than guess.
  if (!safeName || safeName !== raw) {
    return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
  }

  try {
    await unlink(path.join(FALLBACK_DIR, safeName));
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: safeName });
}
