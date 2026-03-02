import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const ALLOWED_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
  "audio/aac",
  "audio/ogg",
  "audio/mp4",
];

const MAX_SIZE = 500 * 1024 * 1024; // 500MB

// POST /api/shows/upload — Multipart file upload
export async function POST(req: NextRequest) {
  const result = await requireAuth();
  if (!result.authorized) return result.response;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Allowed: MP3, WAV, FLAC, AAC, OGG" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 500MB" },
      { status: 400 }
    );
  }

  const uploadsDir = process.env.UPLOADS_DIR || "/srv/radio/uploads";
  await mkdir(uploadsDir, { recursive: true });

  // Generate unique filename
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${timestamp}_${safeName}`;
  const filePath = join(uploadsDir, filename);

  const bytes = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(bytes));

  // Auto-detect duration with ffprobe
  let audioDurationSec: number | null = null;
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "quiet",
      "-show_entries", "format=duration",
      "-of", "csv=p=0",
      filePath,
    ]);
    const parsed = parseFloat(stdout.trim());
    if (!isNaN(parsed)) {
      audioDurationSec = Math.round(parsed);
    }
  } catch {
    // ffprobe not available or file unreadable — duration stays null
  }

  return NextResponse.json({
    filePath,
    filename,
    audioDurationSec,
    size: file.size,
  });
}
