"use client";

import { useState } from "react";

interface TimeSlotPickerProps {
  value: string;
  onChange: (time: string) => void;
  name?: string;
  label?: string;
}

const PERIODS = [
  { label: "Morning", start: 6, end: 12 },
  { label: "Afternoon", start: 12, end: 18 },
  { label: "Evening", start: 18, end: 24 },
  { label: "Late Night", start: 0, end: 6 },
] as const;

function formatTime(h24: number, m: number) {
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function generateSlots(start: number, end: number) {
  const slots: string[] = [];
  for (let h = start; h < end; h++) {
    for (let m = 0; m < 60; m += 30) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}

export default function TimeSlotPicker({
  value,
  onChange,
  name,
  label,
}: TimeSlotPickerProps) {
  // Default to the period containing the current value, or "Evening"
  const valueHour = value ? parseInt(value.split(":")[0], 10) : -1;
  const defaultPeriod =
    PERIODS.findIndex((p) =>
      valueHour >= 0
        ? valueHour >= p.start && valueHour < p.end
        : false
    );
  const [activePeriod, setActivePeriod] = useState(
    defaultPeriod >= 0 ? defaultPeriod : 2
  );

  const period = PERIODS[activePeriod];
  const slots = generateSlots(period.start, period.end);

  return (
    <div>
      {label && (
        <label className="mb-2 block text-sm font-medium text-zinc-300">
          {label}
        </label>
      )}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        {/* Period tabs */}
        <div className="flex gap-1 rounded-lg bg-zinc-800 p-1">
          {PERIODS.map((p, i) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setActivePeriod(i)}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                activePeriod === i
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Time slot grid */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          {slots.map((slot) => {
            const [h, m] = slot.split(":").map(Number);
            const isSelected = slot === value;

            return (
              <button
                key={slot}
                type="button"
                onClick={() => onChange(slot)}
                className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                  isSelected
                    ? "border-white bg-white font-medium text-zinc-900"
                    : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                {formatTime(h, m)}
              </button>
            );
          })}
        </div>
      </div>

      {name && <input type="hidden" name={name} value={value} />}
    </div>
  );
}
