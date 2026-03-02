import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import NavBar from "@/components/NavBar";
import ScheduleCalendar from "@/components/ScheduleCalendar";

export default async function SchedulePage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const dj = await prisma.dJAllowlist.findUnique({
    where: { email: session.user.email },
  });
  if (!dj) redirect("/login");

  // Get shows for the next 4 weeks (enough to navigate)
  const now = new Date();
  const fourWeeks = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

  const shows = await prisma.show.findMany({
    where: {
      scheduledStart: { gte: fourWeeksAgo, lte: fourWeeks },
      OR: [
        { status: { in: ["SCHEDULED", "LIVE", "BROADCASTING", "COMPLETED"] } },
        // Pending shows visible to admin or the requesting DJ
        ...(dj.isAdmin
          ? [{ status: "PENDING_APPROVAL" as const }]
          : [{ status: "PENDING_APPROVAL" as const, djEmail: dj.email }]),
      ],
    },
    orderBy: { scheduledStart: "asc" },
  });

  return (
    <div className="min-h-screen bg-zinc-950">
      <NavBar />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="text-2xl font-bold text-white">Schedule</h1>
        <ScheduleCalendar
          shows={JSON.parse(JSON.stringify(shows))}
          currentUserEmail={dj.email}
          isAdmin={dj.isAdmin}
        />
      </main>
    </div>
  );
}
