"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import CalendarPicker from "@/components/CalendarPicker";
import TimeSlotPicker from "@/components/TimeSlotPicker";

export default function UploadShowPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{
    filePath: string;
    audioDurationSec: number | null;
  } | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const todayStr = new Date().toISOString().split("T")[0];

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploadProgress("Uploading...");
    setUploadPercent(0);
    setUploadedFile(null);

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/shows/upload");

    xhr.upload.addEventListener("progress", (ev) => {
      if (ev.lengthComputable) {
        const pct = Math.round((ev.loaded / ev.total) * 100);
        setUploadPercent(pct);
        setUploadProgress(`Uploading... ${pct}%`);
      }
    });

    xhr.addEventListener("load", () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadedFile({
            filePath: data.filePath,
            audioDurationSec: data.audioDurationSec,
          });
          setUploadProgress("Uploaded successfully!");
          setUploadPercent(100);
        } else {
          setError(data.error || "Upload failed.");
          setUploadProgress(null);
          setUploadPercent(null);
        }
      } catch {
        setError("Upload failed. Please try again.");
        setUploadProgress(null);
        setUploadPercent(null);
      }
    });

    xhr.addEventListener("error", () => {
      setError("Upload failed. Please try again.");
      setUploadProgress(null);
      setUploadPercent(null);
    });

    xhr.send(formData);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!uploadedFile) {
      setError("Please upload a file first.");
      return;
    }

    setError(null);
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const title = form.get("title") as string;
    const description = form.get("description") as string;

    if (!title || !date || !time) {
      setError("Please fill in all required fields.");
      setSubmitting(false);
      return;
    }

    const scheduledStart = new Date(`${date}T${time}`);
    const durationSec = uploadedFile.audioDurationSec || 3600;
    const scheduledEnd = new Date(scheduledStart.getTime() + durationSec * 1000);

    try {
      const res = await fetch("/api/shows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          showType: "RECORDED",
          scheduledStart: scheduledStart.toISOString(),
          scheduledEnd: scheduledEnd.toISOString(),
          audioFilePath: uploadedFile.filePath,
          audioDurationSec: uploadedFile.audioDurationSec,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to submit request.");
        setSubmitting(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <NavBar />
      <main className="mx-auto max-w-xl px-6 py-8">
        <h1 className="text-2xl font-bold text-white">Upload Recorded Show</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Upload your audio file, then pick a broadcast time. An admin will review before it airs.
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-900/50 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mt-6">
          <label className="block text-sm font-medium text-zinc-300">
            Audio File * (MP3, WAV, FLAC, AAC, OGG — max 500MB)
          </label>
          <input
            type="file"
            accept=".mp3,.wav,.flac,.aac,.ogg,audio/*"
            onChange={handleUpload}
            className="mt-2 w-full text-sm text-zinc-400 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-4 file:py-2 file:text-sm file:text-white hover:file:bg-zinc-700"
          />
          {uploadProgress && (
            <div className="mt-2">
              <p className="text-sm text-zinc-400">{uploadProgress}</p>
              {uploadPercent !== null && uploadPercent < 100 && (
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-300"
                    style={{ width: `${uploadPercent}%` }}
                  />
                </div>
              )}
            </div>
          )}
          {uploadedFile?.audioDurationSec && (
            <p className="mt-1 text-xs text-zinc-500">
              Duration detected: {Math.floor(uploadedFile.audioDurationSec / 60)}m{" "}
              {uploadedFile.audioDurationSec % 60}s
            </p>
          )}
        </div>

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
              placeholder="e.g. House Grooves Vol. 3"
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
              placeholder="Episode notes, tracklist, etc."
            />
          </div>

          <CalendarPicker
            value={date}
            onChange={setDate}
            name="date"
            label="Broadcast Date *"
            minDate={todayStr}
          />

          <TimeSlotPicker
            value={time}
            onChange={setTime}
            name="time"
            label="Broadcast Time *"
          />

          <button
            type="submit"
            disabled={submitting || !uploadedFile}
            className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      </main>
    </div>
  );
}
