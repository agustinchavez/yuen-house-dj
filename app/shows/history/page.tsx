import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import NavBar from "@/components/NavBar";

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: "bg-zinc-800 text-zinc-400",
  CANCELLED: "bg-zinc-800 text-zinc-500",
  REJECTED: "bg-red-900/50 text-red-300",
};

export default async function ShowHistoryPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const dj = await prisma.dJAllowlist.findUnique({
    where: { email: session.user.email },
  });
  if (!dj) redirect("/login");

  const shows = await prisma.show.findMany({
    where: {
      ...(dj.isAdmin ? {} : { djEmail: dj.email }),
      status: { in: ["COMPLETED", "CANCELLED", "REJECTED"] },
    },
    orderBy: { scheduledStart: "desc" },
  });

  return (
    <div className="min-h-screen bg-zinc-950">
      <NavBar />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-2xl font-bold text-white">Show History</h1>

        {shows.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-500">No past shows yet.</p>
        ) : (
          <div className="mt-6 space-y-2">
            {shows.map((show) => (
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
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[show.status] ?? "bg-zinc-800 text-zinc-400"}`}>
                  {show.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
