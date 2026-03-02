"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

export default function NavBar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (!session) return null;

  const isAdmin = (session.user as { isAdmin?: boolean }).isAdmin;

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/schedule", label: "Schedule" },
    { href: "/shows/request", label: "Request Show" },
    { href: "/shows/upload", label: "Upload" },
    { href: "/shows/library", label: "My Uploads" },
    { href: "/shows/history", label: "History" },
    { href: "/settings", label: "Settings" },
  ];

  if (isAdmin) {
    links.push({ href: "/admin", label: "Admin" });
  }

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950 px-6 py-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-bold text-white">
            Yuen House Radio
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  pathname.startsWith(link.href)
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-400">
            {session.user?.name ?? session.user?.email}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-md px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
