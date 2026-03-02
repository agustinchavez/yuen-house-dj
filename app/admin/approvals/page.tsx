"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";

interface Show {
  id: string;
  djName: string;
  djEmail: string;
  title: string;
  description: string | null;
  showType: string;
  scheduledStart: string;
  scheduledEnd: string;
  audioFilePath: string | null;
  createdAt: string;
}

export default function ApprovalsPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  async function fetchPending() {
    try {
      const res = await fetch("/api/admin/approvals");
      if (res.status === 403) {
        setError("Admin access required.");
        setLoading(false);
        return;
      }
      if (res.ok) {
        setShows(await res.json());
      }
    } catch {
      setError("Failed to load approvals.");
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchPending();
  }, []);

  async function handleApprove(id: string) {
    setProcessing(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/approvals/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to approve.");
      } else {
        await fetchPending();
      }
    } catch {
      setError("Something went wrong.");
    }
    setProcessing(null);
  }

  async function handleReject(id: string) {
    const note = rejectNote[id]?.trim();
    if (!note) {
      setError("A rejection reason is required.");
      return;
    }
    setProcessing(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/approvals/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to reject.");
      } else {
        await fetchPending();
      }
    } catch {
      setError("Something went wrong.");
    }
    setProcessing(null);
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <NavBar />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-2xl font-bold text-white">Pending Approvals</h1>

        {error && (
          <div className="mt-4 rounded-lg bg-red-900/50 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <p className="mt-8 text-sm text-zinc-500">Loading...</p>
        ) : shows.length === 0 ? (
          <p className="mt-8 text-sm text-zinc-500">No pending requests. You&apos;re all caught up!</p>
        ) : (
          <div className="mt-6 space-y-4">
            {shows.map((show) => (
              <div
                key={show.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-white">{show.title}</h3>
                    <p className="mt-1 text-sm text-zinc-400">
                      {show.djName} ({show.djEmail})
                    </p>
                    {show.description && (
                      <p className="mt-2 text-sm text-zinc-500">{show.description}</p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      show.showType === "LIVE"
                        ? "bg-green-900/50 text-green-300"
                        : "bg-blue-900/50 text-blue-300"
                    }`}
                  >
                    {show.showType}
                  </span>
                </div>

                <div className="mt-3 flex gap-4 text-sm text-zinc-400">
                  <span>
                    {new Date(show.scheduledStart).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span>
                    {new Date(show.scheduledStart).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                    &ndash;{" "}
                    {new Date(show.scheduledEnd).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {/* Audio preview for recorded shows */}
                {show.showType === "RECORDED" && show.audioFilePath && (
                  <div className="mt-3">
                    <p className="mb-1 text-xs font-medium text-zinc-500">Preview audio</p>
                    <audio
                      controls
                      preload="none"
                      src={`/api/shows/audio/${show.id}`}
                      className="h-8 w-full"
                    />
                  </div>
                )}

                {/* Rejection note input */}
                <div className="mt-4">
                  <input
                    type="text"
                    placeholder="Rejection reason (required to reject)"
                    value={rejectNote[show.id] || ""}
                    onChange={(e) =>
                      setRejectNote((prev) => ({ ...prev, [show.id]: e.target.value }))
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
                  />
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleApprove(show.id)}
                    disabled={processing === show.id}
                    className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-green-100 hover:bg-green-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(show.id)}
                    disabled={processing === show.id}
                    className="rounded-lg bg-red-900/50 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-900 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
