"use client";

import { useEffect, useState } from "react";

interface IcecastStatus {
  reachable: boolean;
  // True only while a DJ's source client is connected - not merely while
  // Liquidsoap is publishing, which is always.
  liveConnected: boolean;
  listenerCount: number;
  currentTitle: string | null;
}

export default function OnAirPanel() {
  const [status, setStatus] = useState<IcecastStatus | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/icecast/status");
        if (res.ok) {
          setStatus(await res.json());
        }
      } catch {
        // Icecast unavailable
      }
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex items-center gap-3">
        <div
          className={`h-3 w-3 rounded-full ${
            status?.liveConnected
              ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
              : "bg-zinc-600"
          }`}
        />
        <h2 className="text-lg font-semibold text-white">
          {status?.liveConnected ? "On Air Now" : "Off Air"}
        </h2>
      </div>
      {status?.liveConnected && (
        <div className="mt-3 space-y-1">
          {status.currentTitle && (
            <p className="text-sm text-zinc-300">{status.currentTitle}</p>
          )}
          <p className="text-sm text-zinc-500">
            {status.listenerCount} listener{status.listenerCount !== 1 ? "s" : ""}
          </p>
        </div>
      )}
      {!status?.liveConnected && (
        <p className="mt-3 text-sm text-zinc-500">
          No live source connected. Automated playlist is playing.
        </p>
      )}
    </div>
  );
}
