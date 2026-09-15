import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import NavBar from "@/components/NavBar";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const dj = await prisma.dJAllowlist.findUnique({
    where: { email: session.user.email },
  });
  if (!dj?.isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <NavBar />
        <main className="mx-auto max-w-4xl px-6 py-8">
          <h1 className="text-2xl font-bold text-white">Access Denied</h1>
          <p className="mt-2 text-sm text-zinc-400">Admin access is required to view this page.</p>
        </main>
      </div>
    );
  }

  const pendingCount = await prisma.show.count({
    where: { status: "PENDING_APPROVAL" },
  });

  const djCount = await prisma.dJAllowlist.count();

  return (
    <div className="min-h-screen bg-zinc-950">
      <NavBar />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-2xl font-bold text-white">Admin Panel</h1>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/admin/approvals"
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 transition-colors hover:border-zinc-700"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Pending Approvals</h2>
              {pendingCount > 0 && (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-600 text-sm font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              Review and approve or reject show requests.
            </p>
          </Link>

          <Link
            href="/admin/allowlist"
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 transition-colors hover:border-zinc-700"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">DJ Allowlist</h2>
              <span className="text-sm text-zinc-500">{djCount} DJs</span>
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              Add or remove DJs. Promote or demote admins.
            </p>
          </Link>

          <Link
            href="/admin/stats"
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 transition-colors hover:border-zinc-700"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Broadcast Stats</h2>
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              Icecast listeners, live input, and whether what is scheduled is
              actually on air.
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}
