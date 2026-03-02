"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";

interface Show {
  id: string;
  title: string;
  status: string;
  showType: string;
  audioFilePath: string | null;
  audioDurationSec: number | null;
  scheduledStart: string;
  createdAt: string;
}

export default function LibraryPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/shows");
        if (res.ok) {
          const data: Show[] = await res.json();
          setShows(data.filter((s) => s.showType === "RECORDED" && s.audioFilePath));
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, []);

  function formatDuration(sec: number | null) {
    if (!sec) return "Unknown";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  }

  const statusColor: Record<string, string> = {
    PENDING_APPROVAL: "bg-amber-900/50 text-amber-300",
    SCHEDULED: "bg-green-900/50 text-green-300",
    COMPLETED: "bg-zinc-700 text-zinc-300",
    REJECTED: "bg-red-900/50 text-red-300",
    CANCELLED: "bg-zinc-700 text-zinc-400",
    BROADCASTING: "bg-blue-900/50 text-blue-300",
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <NavBar />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">My Uploads</h1>
          <Link
            href="/shows/upload"
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200"
          >
            Upload New
          </Link>
        </div>

        {loading ? (
          <p className="mt-8 text-sm text-zinc-500">Loading...</p>
        ) : shows.length === 0 ? (
          <p className="mt-8 text-sm text-zinc-500">
            No uploaded recordings yet. Upload your first show!
          </p>
        ) : (
          <div className="mt-6 space-y-2">
            {shows.map((show) => (
              <div
                key={show.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/shows/${show.id}`}
                        className="text-sm font-medium text-white hover:underline"
                      >
                        {show.title}
                      </Link>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          statusColor[show.status] || "bg-zinc-700 text-zinc-300"
                        }`}
                      >
                        {show.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Duration: {formatDuration(show.audioDurationSec)} &middot;{" "}
                      Uploaded {new Date(show.createdAt).toLocaleDateString()} &middot;{" "}
                      Scheduled {new Date(show.scheduledStart).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <audio
                    controls
                    preload="none"
                    src={`/api/shows/audio/${show.id}`}
                    className="h-8 w-48"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
