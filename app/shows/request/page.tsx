"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import NavBar from "@/components/NavBar";
import CalendarPicker from "@/components/CalendarPicker";
import TimeSlotPicker from "@/components/TimeSlotPicker";

function RequestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState(searchParams.get("date") || "");
  const [time, setTime] = useState(searchParams.get("time") || "");
  const [repeatWeeks, setRepeatWeeks] = useState(1);

  const todayStr = new Date().toISOString().split("T")[0];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const title = form.get("title") as string;
    const description = form.get("description") as string;
    const duration = parseInt(form.get("duration") as string, 10);

    if (!title || !date || !time || !duration) {
      setError("Please fill in all required fields.");
      setSubmitting(false);
      return;
    }

    if (duration < 30 || duration > 180) {
      setError("Duration must be between 30 and 180 minutes.");
      setSubmitting(false);
      return;
    }

    const weeks = Math.max(1, Math.min(repeatWeeks, 12));
    const errors: string[] = [];

    for (let w = 0; w < weeks; w++) {
      const baseStart = new Date(`${date}T${time}`);
      baseStart.setDate(baseStart.getDate() + w * 7);
      const baseEnd = new Date(baseStart.getTime() + duration * 60 * 1000);

      try {
        const res = await fetch("/api/shows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: weeks > 1 ? `${title} (Week ${w + 1})` : title,
            description: description || null,
            showType: "LIVE",
            scheduledStart: baseStart.toISOString(),
            scheduledEnd: baseEnd.toISOString(),
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          errors.push(`Week ${w + 1}: ${data.error || "Failed"}`);
        }
      } catch {
        errors.push(`Week ${w + 1}: Network error`);
      }
    }

    if (errors.length > 0 && errors.length === weeks) {
      setError(errors.join(". "));
      setSubmitting(false);
      return;
    }

    if (errors.length > 0) {
      setError(`Some weeks failed: ${errors.join(". ")}. Others were submitted.`);
    }

    router.push("/dashboard");
  }

  return (
    <>
      {error && (
        <div className="mt-4 rounded-lg bg-red-900/50 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-zinc-300">
            Show Title *
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
            placeholder="e.g. Late Night Jazz"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-zinc-300">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
            placeholder="What's the vibe? Genre, theme, etc."
          />
        </div>

        <CalendarPicker
          value={date}
          onChange={setDate}
          name="date"
          label="Date *"
          minDate={todayStr}
        />

        <TimeSlotPicker
          value={time}
          onChange={setTime}
          name="time"
          label="Start Time *"
        />

        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-zinc-300">
            Duration (minutes) *
          </label>
          <input
            id="duration"
            name="duration"
            type="number"
            min={30}
            max={180}
            defaultValue={60}
            required
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white focus:border-zinc-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-zinc-500">30 to 180 minutes</p>
        </div>

        <div>
          <label htmlFor="repeatWeeks" className="block text-sm font-medium text-zinc-300">
            Repeat weekly
          </label>
          <select
            id="repeatWeeks"
            value={repeatWeeks}
            onChange={(e) => setRepeatWeeks(parseInt(e.target.value, 10))}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white focus:border-zinc-500 focus:outline-none"
          >
            <option value={1}>No repeat (single show)</option>
            {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
              <option key={n} value={n}>
                Every week for {n} weeks
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-500">
            Each week creates a separate request for admin approval.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit Request"}
        </button>
      </form>
    </>
  );
}

export default function RequestShowPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <NavBar />
      <main className="mx-auto max-w-xl px-6 py-8">
        <h1 className="text-2xl font-bold text-white">Request a Live Show</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Submit your request. It will be reviewed by an admin before appearing on the schedule.
        </p>
        <Suspense fallback={<p className="mt-6 text-sm text-zinc-500">Loading...</p>}>
          <RequestForm />
        </Suspense>
      </main>
    </div>
  );
}
