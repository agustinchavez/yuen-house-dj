"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import NavBar from "@/components/NavBar";

interface Track {
  name: string;
  sizeBytes: number;
  addedAt: string;
}

const formatSize = (bytes: number) =>
  bytes > 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export default function FallbackPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const fetchTracks = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/fallback");
      if (res.status === 403) {
        setError("Admin access required.");
        return;
      }
      const data = await res.json();
      setTracks(data.tracks ?? []);
      setError(null);
    } catch {
      setError("Could not load the music library.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    setUploading(true);
    setNotice(null);

    const formData = new FormData();
    for (const file of Array.from(files)) formData.append("files", file);

    try {
      const res = await fetch("/api/admin/fallback", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setNotice(data.error ?? "Upload failed.");
      } else {
        const parts = [`Added ${data.saved.length} track(s).`];
        for (const r of data.rejected ?? []) {
          parts.push(`Skipped ${r.name}: ${r.reason}.`);
        }
        setNotice(parts.join(" "));
      }
      await fetchTracks();
    } catch {
      setNotice("Upload failed.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function handleDelete(name: string) {
    if (!confirm(`Remove "${name}" from the 24/7 rotation?`)) return;
    setDeleting(name);
    try {
      const res = await fetch(
        `/api/admin/fallback?name=${encodeURIComponent(name)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        setNotice(data.error ?? "Could not delete the file.");
      }
      await fetchTracks();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <NavBar />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-2xl font-bold text-white">24/7 Music</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Whatever lives here plays on shuffle whenever no show is on the air.
          Changes take effect within moments — no restarts, nothing to schedule.
        </p>

        <div className="mt-6 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-6 text-center">
          <input
            ref={fileInput}
            type="file"
            accept=".mp3,.wav,.flac,.aac,.ogg,.m4a,audio/*"
            multiple
            hidden
            onChange={(e) => handleUpload(e.target.files)}
          />
          <button
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-zinc-950 hover:bg-zinc-200 disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Add music"}
          </button>
          <p className="mt-2 text-xs text-zinc-500">
            MP3, WAV, FLAC, AAC or OGG · several files at once is fine
          </p>
        </div>

        {notice && <p className="mt-4 text-sm text-zinc-300">{notice}</p>}
        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        {loading && <p className="mt-4 text-sm text-zinc-500">Loading...</p>}

        {!loading && !error && (
          <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900">
            <div className="border-b border-zinc-800 px-5 py-3 text-sm text-zinc-400">
              {tracks.length === 0
                ? "The library is empty — listeners hear silence between shows."
                : `${tracks.length} track(s) in rotation`}
            </div>
            <ul className="divide-y divide-zinc-800">
              {tracks.map((t) => (
                <li
                  key={t.name}
                  className="flex items-center justify-between gap-4 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-200">{t.name}</p>
                    <p className="text-xs text-zinc-500">
                      {formatSize(t.sizeBytes)} · added{" "}
                      {new Date(t.addedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(t.name)}
                    disabled={deleting === t.name}
                    className="shrink-0 rounded-lg px-3 py-1.5 text-xs text-red-400 hover:bg-red-950/50 disabled:opacity-50"
                  >
                    {deleting === t.name ? "..." : "Remove"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
