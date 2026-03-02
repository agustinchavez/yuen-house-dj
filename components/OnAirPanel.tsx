"use client";

import { useEffect, useState } from "react";

interface IcecastStatus {
  listener_count: number;
  source_connected: boolean;
  current_title: string | null;
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
            status?.source_connected
              ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
              : "bg-zinc-600"
          }`}
        />
        <h2 className="text-lg font-semibold text-white">
          {status?.source_connected ? "On Air Now" : "Off Air"}
        </h2>
      </div>
      {status?.source_connected && (
        <div className="mt-3 space-y-1">
          {status.current_title && (
            <p className="text-sm text-zinc-300">{status.current_title}</p>
          )}
          <p className="text-sm text-zinc-500">
            {status.listener_count} listener{status.listener_count !== 1 ? "s" : ""}
          </p>
        </div>
      )}
      {!status?.source_connected && (
        <p className="mt-3 text-sm text-zinc-500">
          No live source connected. Automated playlist is playing.
        </p>
      )}
    </div>
  );
}
