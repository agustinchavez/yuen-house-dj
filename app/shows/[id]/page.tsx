import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import NavBar from "@/components/NavBar";
import ShowDetailClient from "./ShowDetailClient";

export default async function ShowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const { id } = await params;

  const dj = await prisma.dJAllowlist.findUnique({
    where: { email: session.user.email },
  });
  if (!dj) redirect("/login");

  const show = await prisma.show.findUnique({ where: { id } });
  if (!show) notFound();

  if (!dj.isAdmin && show.djEmail !== dj.email) notFound();

  return (
    <div className="min-h-screen bg-zinc-950">
      <NavBar />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <ShowDetailClient
          show={JSON.parse(JSON.stringify(show))}
          isAdmin={dj.isAdmin}
          isOwner={show.djEmail === dj.email}
          icecastSourcePassword={process.env.ICECAST_SOURCE_PASSWORD || ""}
        />
      </main>
    </div>
  );
}
