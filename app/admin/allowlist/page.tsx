"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";

interface DJ {
  email: string;
  isAdmin: boolean;
  displayName: string | null;
  addedAt: string;
  addedByEmail: string;
  firstLoginAt: string | null;
  lastLoginAt: string | null;
  showCount: number;
}

export default function AllowlistPage() {
  const [djs, setDjs] = useState<DJ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [resetEmail, setResetEmail] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkEmails, setBulkEmails] = useState("");
  const [bulkPassword, setBulkPassword] = useState("");
  const [bulkAdding, setBulkAdding] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  async function fetchDjs() {
    try {
      const res = await fetch("/api/admin/allowlist");
      if (res.status === 403) {
        setError("Admin access required.");
        setLoading(false);
        return;
      }
      if (res.ok) {
        setDjs(await res.json());
      }
    } catch {
      setError("Failed to load allowlist.");
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchDjs();
  }, []);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newEmail.trim() || !newPassword.trim()) return;
    setAdding(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/allowlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail.trim(),
          password: newPassword,
          displayName: newName.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to add DJ.");
      } else {
        setNewEmail("");
        setNewPassword("");
        setNewName("");
        await fetchDjs();
      }
    } catch {
      setError("Something went wrong.");
    }
    setAdding(false);
  }

  async function handleRemove(email: string) {
    if (!confirm(`Remove ${email} from the allowlist?`)) return;

    try {
      const res = await fetch(`/api/admin/allowlist/${encodeURIComponent(email)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchDjs();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to remove DJ.");
      }
    } catch {
      setError("Something went wrong.");
    }
  }

  async function handleResetPassword(email: string) {
    if (!resetPassword.trim() || resetPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setResetting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/allowlist/${encodeURIComponent(email)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: resetPassword }),
      });
      if (res.ok) {
        setResetEmail(null);
        setResetPassword("");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to reset password.");
      }
    } catch {
      setError("Something went wrong.");
    }
    setResetting(false);
  }

  async function handleBulkImport() {
    if (!bulkEmails.trim() || !bulkPassword.trim()) return;
    if (bulkPassword.length < 6) {
      setError("Bulk password must be at least 6 characters.");
      return;
    }
    setBulkAdding(true);
    setError(null);
    setBulkResult(null);

    try {
      const res = await fetch("/api/admin/allowlist/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: bulkEmails, password: bulkPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Bulk import failed.");
      } else {
        setBulkResult(`Added ${data.added}, skipped ${data.skipped} (already exist) out of ${data.total} emails.`);
        setBulkEmails("");
        setBulkPassword("");
        await fetchDjs();
      }
    } catch {
      setError("Something went wrong.");
    }
    setBulkAdding(false);
  }

  async function handleToggleAdmin(email: string, currentIsAdmin: boolean) {
    const action = currentIsAdmin ? "demote" : "promote";
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${email}?`)) return;

    try {
      const res = await fetch(`/api/admin/allowlist/${encodeURIComponent(email)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAdmin: !currentIsAdmin }),
      });
      if (res.ok) {
        await fetchDjs();
      } else {
        const data = await res.json();
        setError(data.error || `Failed to ${action}.`);
      }
    } catch {
      setError("Something went wrong.");
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <NavBar />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-2xl font-bold text-white">DJ Allowlist</h1>

        {error && (
          <div className="mt-4 rounded-lg bg-red-900/50 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Add DJ Form */}
        <form onSubmit={handleAdd} className="mt-6 space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="text-sm font-semibold text-white">Add a DJ</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Email *"
              required
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Password *"
              required
              minLength={6}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
            />
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Display name (optional)"
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            className="rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
          >
            {adding ? "Adding..." : "Add DJ"}
          </button>
        </form>

        {/* Bulk Import */}
        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <button
            type="button"
            onClick={() => setShowBulk(!showBulk)}
            className="text-sm font-semibold text-white"
          >
            {showBulk ? "Hide" : "Show"} Bulk Import
          </button>

          {showBulk && (
            <div className="mt-3 space-y-3">
              <textarea
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                placeholder="Paste emails (comma, newline, or space separated)"
                rows={4}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
              />
              <input
                type="password"
                value={bulkPassword}
                onChange={(e) => setBulkPassword(e.target.value)}
                placeholder="Initial password for all (min 6 chars) *"
                minLength={6}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleBulkImport}
                disabled={bulkAdding}
                className="rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
              >
                {bulkAdding ? "Importing..." : "Import All"}
              </button>
              {bulkResult && (
                <p className="text-sm text-green-300">{bulkResult}</p>
              )}
            </div>
          )}
        </div>

        {/* DJ List */}
        {loading ? (
          <p className="mt-8 text-sm text-zinc-500">Loading...</p>
        ) : (
          <div className="mt-6 space-y-2">
            {djs.map((dj) => (
              <div key={dj.email} className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">
                        {dj.displayName ?? dj.email}
                      </p>
                      {dj.isAdmin && (
                        <span className="rounded-full bg-purple-900/50 px-2 py-0.5 text-[10px] font-medium text-purple-300">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500">
                      {dj.email} &middot; {dj.showCount} show{dj.showCount !== 1 ? "s" : ""} &middot;{" "}
                      Added {new Date(dj.addedAt).toLocaleDateString()}
                      {dj.lastLoginAt && (
                        <> &middot; Last login {new Date(dj.lastLoginAt).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setResetEmail(resetEmail === dj.email ? null : dj.email)
                      }
                      className="rounded-md px-2 py-1 text-xs text-zinc-400 hover:text-white"
                    >
                      Reset PW
                    </button>
                    <button
                      onClick={() => handleToggleAdmin(dj.email, dj.isAdmin)}
                      className="rounded-md px-2 py-1 text-xs text-zinc-400 hover:text-white"
                    >
                      {dj.isAdmin ? "Demote" : "Promote"}
                    </button>
                    <button
                      onClick={() => handleRemove(dj.email)}
                      className="rounded-md px-2 py-1 text-xs text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* Inline password reset */}
                {resetEmail === dj.email && (
                  <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
                    <input
                      type="password"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      placeholder="New password (min 6 chars)"
                      minLength={6}
                      className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
                    />
                    <button
                      onClick={() => handleResetPassword(dj.email)}
                      disabled={resetting}
                      className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
                    >
                      {resetting ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setResetEmail(null);
                        setResetPassword("");
                      }}
                      className="rounded-lg px-3 py-2 text-sm text-zinc-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
