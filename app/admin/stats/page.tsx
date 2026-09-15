"use client";

import { useCallback, useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import type { BroadcastStats } from "@/lib/broadcast-health";

const STATUS_ORDER = [
  "PENDING_APPROVAL",
  "SCHEDULED",
  "LIVE",
  "BROADCASTING",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
];

function Dot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${
        ok ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500"
      }`}
    />
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<BroadcastStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.status === 403) {
        setError("Admin access required.");
        return;
      }
      if (!res.ok) {
        setError("Could not load broadcast stats.");
        return;
      }
      setStats(await res.json());
      setError(null);
    } catch {
      setError("Could not reach the dashboard API.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return (
    <div className="min-h-screen bg-zinc-950">
      <NavBar />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-2xl font-bold text-white">Broadcast Stats</h1>
          {stats && (
            <p className="text-xs text-zinc-600">
              updated {new Date(stats.checkedAt).toLocaleTimeString()} &middot; every 30s
            </p>
          )}
        </div>

        {loading && <p className="mt-6 text-sm text-zinc-500">Loading...</p>}
        {error && <p className="mt-6 text-sm text-red-400">{error}</p>}

        {stats && (
          <>
            {stats.warnings.length > 0 && (
              <div className="mt-6 rounded-xl border border-amber-900/60 bg-amber-950/30 p-4">
                <h2 className="text-sm font-semibold text-amber-300">
                  Needs attention
                </h2>
                <ul className="mt-2 space-y-1">
                  {stats.warnings.map((w) => (
                    <li key={w} className="text-sm text-amber-200/80">
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Service health */}
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <div className="flex items-center gap-2">
                  <Dot ok={stats.icecast.reachable} />
                  <h2 className="text-sm font-semibold text-white">Icecast</h2>
                </div>
                <p className="mt-2 text-2xl font-bold text-white">
                  {stats.icecast.listenerCount}
                </p>
                <p className="text-xs text-zinc-500">
                  listener{stats.icecast.listenerCount !== 1 ? "s" : ""} on /
                  {stats.mountNames.stream}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <div className="flex items-center gap-2">
                  <Dot ok={stats.liquidsoap.reachable} />
                  <h2 className="text-sm font-semibold text-white">Liquidsoap</h2>
                </div>
                <p className="mt-2 text-sm text-zinc-400">
                  {stats.liquidsoap.reachable
                    ? "Accepting queued shows"
                    : "Unreachable - recorded shows will not air"}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <div className="flex items-center gap-2">
                  <Dot ok={stats.icecast.liveConnected} />
                  <h2 className="text-sm font-semibold text-white">Live input</h2>
                </div>
                <p className="mt-2 text-sm text-zinc-400">
                  {stats.icecast.liveConnected
                    ? stats.icecast.currentTitle ?? "DJ connected"
                    : `No DJ on /${stats.mountNames.live}`}
                </p>
              </div>
            </div>

            {/* What is on air */}
            <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="text-sm font-semibold text-white">On air now</h2>
              {stats.shows.onAir.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-500">
                  No show is marked on air. Listeners hear the automated playlist.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {stats.shows.onAir.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-4 text-sm"
                    >
                      <span className="text-zinc-200">
                        {s.title}{" "}
                        <span className="text-zinc-500">&middot; {s.djName}</span>
                      </span>
                      <span className="whitespace-nowrap text-xs text-zinc-500">
                        {s.status} &middot; until{" "}
                        {new Date(s.scheduledEnd).toLocaleTimeString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {stats.shows.next && (
                <p className="mt-3 border-t border-zinc-800 pt-3 text-xs text-zinc-500">
                  Next: {stats.shows.next.title} &middot; {stats.shows.next.djName}{" "}
                  &middot; {new Date(stats.shows.next.scheduledStart).toLocaleString()}
                </p>
              )}
            </div>

            {/* Connected mounts */}
            <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="text-sm font-semibold text-white">Connected mounts</h2>
              <p className="mt-1 text-xs text-zinc-500">
                A mount appears only while something is publishing to it.
              </p>
              {stats.icecast.mounts.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500">
                  {stats.icecast.reachable
                    ? "Nothing is publishing to Icecast."
                    : "Icecast is unreachable."}
                </p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-wide text-zinc-600">
                        <th className="pb-2 font-medium">Mount</th>
                        <th className="pb-2 font-medium">Listeners</th>
                        <th className="pb-2 font-medium">Now playing</th>
                      </tr>
                    </thead>
                    <tbody className="text-zinc-300">
                      {stats.icecast.mounts.map((m) => (
                        <tr key={m.mount} className="border-t border-zinc-800">
                          <td className="py-2 font-mono text-xs">/{m.mount}</td>
                          <td className="py-2">{m.listeners}</td>
                          <td className="py-2 text-zinc-400">{m.title ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Shows by status */}
            <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="text-sm font-semibold text-white">Shows by status</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {STATUS_ORDER.filter((s) => stats.shows.byStatus[s]).map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300"
                  >
                    {s.replace("_", " ").toLowerCase()}: {stats.shows.byStatus[s]}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
