"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Show {
  id: string;
  djEmail: string;
  djName: string;
  title: string;
  description: string | null;
  showType: string;
  status: string;
  scheduledStart: string;
  scheduledEnd: string;
  audioFilePath: string | null;
  adminNote: string | null;
  approvedByEmail: string | null;
  approvedAt: string | null;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING_APPROVAL: "bg-amber-900/50 text-amber-300",
  SCHEDULED: "bg-green-900/50 text-green-300",
  LIVE: "bg-red-900/50 text-red-300",
  BROADCASTING: "bg-purple-900/50 text-purple-300",
  COMPLETED: "bg-zinc-800 text-zinc-400",
  REJECTED: "bg-red-900/50 text-red-300",
  CANCELLED: "bg-zinc-800 text-zinc-500",
};

export default function ShowDetailClient({
  show,
  isAdmin,
  isOwner,
  broadcast,
}: {
  show: Show;
  isAdmin: boolean;
  isOwner: boolean;
  broadcast: {
    host: string;
    port: string;
    mount: string;
    sourcePassword: string;
  };
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(show.title);
  const [description, setDescription] = useState(show.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit =
    (isOwner || isAdmin) &&
    (show.status === "PENDING_APPROVAL" || show.status === "SCHEDULED");

  const canCancel =
    (isOwner || isAdmin) &&
    (show.status === "PENDING_APPROVAL" || show.status === "SCHEDULED");

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/shows/${show.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description: description || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save.");
      } else {
        setEditing(false);
        router.refresh();
      }
    } catch {
      setError("Something went wrong.");
    }
    setSaving(false);
  }

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel this show?")) return;
    try {
      const res = await fetch(`/api/shows/${show.id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      }
    } catch {
      // ignore
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[show.status] ?? "bg-zinc-800 text-zinc-400"}`}>
          {show.status.replace("_", " ")}
        </span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${show.showType === "LIVE" ? "bg-green-900/50 text-green-300" : "bg-blue-900/50 text-blue-300"}`}>
          {show.showType}
        </span>
      </div>

      {editing ? (
        <div className="mt-4 space-y-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-lg font-bold text-white focus:border-zinc-500 focus:outline-none"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white focus:border-zinc-500 focus:outline-none"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50">
              {saving ? "Saving..." : "Save"}
            </button>
            <button onClick={() => setEditing(false)} className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700">
              Discard
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <h1 className="text-2xl font-bold text-white">{show.title}</h1>
          {show.description && (
            <p className="mt-2 text-sm text-zinc-400">{show.description}</p>
          )}
        </div>
      )}

      <div className="mt-6 space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">DJ</span>
          <span className="text-zinc-300">{show.djName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Date</span>
          <span className="text-zinc-300">
            {new Date(show.scheduledStart).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Time</span>
          <span className="text-zinc-300">
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
        {show.adminNote && (
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Admin Note</span>
            <span className="text-zinc-300">{show.adminNote}</span>
          </div>
        )}
      </div>

      {show.showType === "LIVE" && show.status === "SCHEDULED" && isOwner && (
        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-sm font-semibold text-white">Mixxx Broadcast Settings</h2>
          <p className="mt-1 text-xs text-zinc-500">Enter these in Mixxx Preferences &rarr; Live Broadcasting</p>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Server</span>
              <code className="text-zinc-300">{broadcast.host}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Port</span>
              <code className="text-zinc-300">{broadcast.port}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Mount Point</span>
              <code className="text-zinc-300">{broadcast.mount}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Source Password</span>
              <code className="text-zinc-300">{broadcast.sourcePassword}</code>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        {canEdit && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
          >
            Edit
          </button>
        )}
        {canCancel && (
          <button
            onClick={handleCancel}
            className="rounded-lg bg-red-900/50 px-4 py-2 text-sm text-red-300 hover:bg-red-900"
          >
            Cancel Show
          </button>
        )}
      </div>
    </div>
  );
}
