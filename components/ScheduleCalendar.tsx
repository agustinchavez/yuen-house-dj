"use client";

import { useState } from "react";
import Link from "next/link";

interface Show {
  id: string;
  djName: string;
  title: string;
  showType: string;
  status: string;
  scheduledStart: string;
  scheduledEnd: string;
  djEmail: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function ScheduleCalendar({
  shows,
  currentUserEmail,
  isAdmin,
}: {
  shows: Show[];
  currentUserEmail: string;
  isAdmin: boolean;
}) {
  const [weekOffset, setWeekOffset] = useState(0);

  const today = new Date();
  const weekStart = getWeekStart(today);
  weekStart.setDate(weekStart.getDate() + weekOffset * 7);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  function showsForDay(day: Date) {
    return shows.filter((show) => {
      const start = new Date(show.scheduledStart);
      return (
        start.getFullYear() === day.getFullYear() &&
        start.getMonth() === day.getMonth() &&
        start.getDate() === day.getDate()
      );
    });
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
          className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700"
        >
          &larr; Prev
        </button>
        <span className="text-sm text-zinc-400">
          {days[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          {" \u2013 "}
          {days[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
        <button
          onClick={() => setWeekOffset((o) => o + 1)}
          className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700"
        >
          Next &rarr;
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-2">
        {days.map((day, i) => {
          const dayShows = showsForDay(day);
          const isToday = day.toDateString() === today.toDateString();

          return (
            <div key={i} className="min-h-[120px] rounded-lg border border-zinc-800 bg-zinc-900 p-2">
              <div className={`text-xs font-medium ${isToday ? "text-white" : "text-zinc-500"}`}>
                {DAYS[i]}
                <span className={`ml-1 ${isToday ? "rounded-full bg-white px-1.5 py-0.5 text-zinc-900" : ""}`}>
                  {day.getDate()}
                </span>
              </div>
              <div className="mt-2 space-y-1">
                {dayShows.map((show) => {
                  const isPending = show.status === "PENDING_APPROVAL";
                  const isOwn = show.djEmail === currentUserEmail;

                  if (isPending && !isAdmin && !isOwn) return null;

                  return (
                    <Link
                      key={show.id}
                      href={`/shows/${show.id}`}
                      className={`block rounded px-1.5 py-1 text-xs transition-colors hover:opacity-80 ${
                        isPending
                          ? "border border-dashed border-amber-800 bg-amber-900/20 text-amber-300"
                          : show.showType === "LIVE"
                            ? "bg-green-900/30 text-green-300"
                            : "bg-blue-900/30 text-blue-300"
                      }`}
                    >
                      <div className="truncate font-medium">{show.title}</div>
                      <div className="text-[10px] opacity-70">
                        {new Date(show.scheduledStart).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {" "}
                        {show.djName}
                      </div>
                    </Link>
                  );
                })}
                {dayShows.filter((s) => s.status !== "PENDING_APPROVAL" || isAdmin || s.djEmail === currentUserEmail).length === 0 && (
                  <Link
                    href={`/shows/request?date=${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`}
                    className="block rounded bg-zinc-800/50 px-1.5 py-1 text-[10px] text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-zinc-400"
                  >
                    Automated &middot; Request slot
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
