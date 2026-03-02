import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import OnAirPanel from "@/components/OnAirPanel";
import NavBar from "@/components/NavBar";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const email = session.user.email;
  const dj = await prisma.dJAllowlist.findUnique({ where: { email } });
  if (!dj) redirect("/login");

  const isAdmin = dj.isAdmin;

  // Upcoming approved shows (next 5)
  const upcomingShows = await prisma.show.findMany({
    where: {
      ...(isAdmin ? {} : { djEmail: email }),
      status: "SCHEDULED",
      scheduledStart: { gte: new Date() },
    },
    orderBy: { scheduledStart: "asc" },
    take: 5,
  });

  // Pending requests
  const pendingShows = await prisma.show.findMany({
    where: {
      ...(isAdmin ? {} : { djEmail: email }),
      status: "PENDING_APPROVAL",
    },
    orderBy: { createdAt: "desc" },
  });

  // Admin: total pending count
  const pendingCount = isAdmin
    ? await prisma.show.count({ where: { status: "PENDING_APPROVAL" } })
    : 0;

  return (
    <div className="min-h-screen bg-zinc-950">
      <NavBar />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="text-2xl font-bold text-white">
          Welcome, {dj.displayName ?? "DJ"}
        </h1>

        {isAdmin && pendingCount > 0 && (
          <Link
            href="/admin/approvals"
            className="mt-4 flex items-center gap-2 rounded-lg bg-amber-900/30 border border-amber-800 px-4 py-3 text-amber-200 transition-colors hover:bg-amber-900/50"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">
              {pendingCount}
            </span>
            show request{pendingCount !== 1 ? "s" : ""} pending approval
          </Link>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <OnAirPanel />

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
            <div className="mt-4 flex flex-col gap-3">
              <Link
                href="/shows/request"
                className="rounded-lg bg-zinc-800 px-4 py-3 text-sm text-white transition-colors hover:bg-zinc-700"
              >
                Request a Live Show
              </Link>
              <Link
                href="/shows/upload"
                className="rounded-lg bg-zinc-800 px-4 py-3 text-sm text-white transition-colors hover:bg-zinc-700"
              >
                Upload Recorded Show
              </Link>
              <Link
                href="/schedule"
                className="rounded-lg bg-zinc-800 px-4 py-3 text-sm text-white transition-colors hover:bg-zinc-700"
              >
                View Schedule
              </Link>
            </div>
          </div>
        </div>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-white">Upcoming Shows</h2>
          {upcomingShows.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">No upcoming shows scheduled.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {upcomingShows.map((show) => (
                <Link
                  key={show.id}
                  href={`/shows/${show.id}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 transition-colors hover:border-zinc-700"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{show.title}</p>
                    <p className="text-xs text-zinc-500">
                      {show.djName} &middot;{" "}
                      {new Date(show.scheduledStart).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      {new Date(show.scheduledStart).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
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
                </Link>
              ))}
            </div>
          )}
        </section>

        {pendingShows.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-white">Pending Requests</h2>
            <div className="mt-3 space-y-2">
              {pendingShows.map((show) => (
                <Link
                  key={show.id}
                  href={`/shows/${show.id}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 transition-colors hover:border-zinc-700"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{show.title}</p>
                    <p className="text-xs text-zinc-500">
                      {new Date(show.scheduledStart).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      {new Date(show.scheduledStart).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-900/50 px-2 py-0.5 text-xs font-medium text-amber-300">
                    Pending
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
