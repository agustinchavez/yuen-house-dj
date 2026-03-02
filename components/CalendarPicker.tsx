"use client";

import { useState } from "react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface CalendarPickerProps {
  value: string;
  onChange: (date: string) => void;
  name?: string;
  minDate?: string;
  label?: string;
}

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function CalendarPicker({
  value,
  onChange,
  name,
  minDate,
  label,
}: CalendarPickerProps) {
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const initial = value ? new Date(value + "T00:00") : today;
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [viewYear, setViewYear] = useState(initial.getFullYear());

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function isDisabled(dateStr: string) {
    if (minDate && dateStr < minDate) return true;
    return false;
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      {label && (
        <label className="mb-2 block text-sm font-medium text-zinc-300">
          {label}
        </label>
      )}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={prevMonth}
            className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700"
          >
            &larr;
          </button>
          <span className="text-sm font-medium text-white">
            {MONTHS[viewMonth]} {viewYear}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700"
          >
            &rarr;
          </button>
        </div>

        {/* Day headers */}
        <div className="mt-3 grid grid-cols-7 gap-1">
          {DAYS.map((d) => (
            <div
              key={d}
              className="py-1 text-center text-xs font-medium text-zinc-500"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} />;
            }

            const dateStr = toDateStr(viewYear, viewMonth, day);
            const isSelected = dateStr === value;
            const isToday = dateStr === todayStr;
            const disabled = isDisabled(dateStr);

            return (
              <button
                key={dateStr}
                type="button"
                disabled={disabled}
                onClick={() => onChange(dateStr)}
                className={`rounded-lg py-2 text-center text-sm transition-colors ${
                  isSelected
                    ? "bg-white font-medium text-zinc-900"
                    : isToday
                      ? "font-medium text-white hover:bg-zinc-800"
                      : disabled
                        ? "cursor-not-allowed text-zinc-700"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {name && <input type="hidden" name={name} value={value} />}
    </div>
  );
}
