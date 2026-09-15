import fs from "fs/promises";
import path from "path";

// The fallback library: everything in this directory is what listeners hear
// whenever no show is on. Liquidsoap watches it (reload_mode="watch"), so adds
// and deletes take effect within moments, with no restarts and no queueing.

export const FALLBACK_DIR = process.env.FALLBACK_DIR || "/srv/radio/fallback";

export const AUDIO_EXTENSIONS = [".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a"];

export interface FallbackTrack {
  name: string;
  sizeBytes: number;
  addedAt: string;
}

/**
 * Reduce an uploaded filename to something safe to place on disk.
 * Returns null when nothing usable remains or the extension is not audio.
 *
 * Security note: this value is later joined onto FALLBACK_DIR and passed to
 * unlink, so it must never be able to traverse out of the directory.
 */
export function sanitizeAudioFilename(input: string): string | null {
  const base = path.basename(input);

  // Gate on the real extension (case preserved, checked case-insensitively)
  const ext = path.extname(base);
  if (!AUDIO_EXTENSIONS.includes(ext.toLowerCase())) return null;

  // Then flatten everything else that could mean something to a filesystem:
  // separators, control bytes, and any ".." run - even though a bare filename
  // cannot traverse, there is no reason to preserve the sequence at all.
  const stem = path
    .basename(base, ext)
    .replace(/[^\w.\- ]/g, "_")
    .replace(/\.{2,}/g, "_")
    .replace(/\.+$/g, "")
    .trim();

  if (!stem) return null;

  return `${stem}${ext}`;
}

export async function listFallbackTracks(): Promise<FallbackTrack[]> {
  await fs.mkdir(FALLBACK_DIR, { recursive: true });
  const entries = await fs.readdir(FALLBACK_DIR);

  const tracks: FallbackTrack[] = [];
  for (const name of entries) {
    if (!AUDIO_EXTENSIONS.includes(path.extname(name).toLowerCase())) continue;
    const stat = await fs.stat(path.join(FALLBACK_DIR, name));
    if (!stat.isFile()) continue;
    tracks.push({
      name,
      sizeBytes: stat.size,
      addedAt: stat.mtime.toISOString(),
    });
  }

  return tracks.sort((a, b) => a.name.localeCompare(b.name));
}
