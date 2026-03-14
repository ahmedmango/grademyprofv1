"use client";

import { useMemo, useState, useEffect } from "react";
import type { CourseEntry } from "@/lib/schedule-types";
import { BAHRAIN_DAYS, WESTERN_DAYS, formatTime, timeToMinutes } from "@/lib/schedule-constants";

interface Props {
  entries: CourseEntry[];
  weekStart: "sun" | "mon";
}

export default function TodayView({ entries, weekStart }: Props) {
  const [now, setNow] = useState(new Date());
  const days = weekStart === "sun" ? BAHRAIN_DAYS : WESTERN_DAYS;

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const todayDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][now.getDay()];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const isSchoolDay = days.includes(todayDay);

  const todayEntries = useMemo(() => {
    return entries
      .filter((e) => e.days.includes(todayDay))
      .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
  }, [entries, todayDay]);

  const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.getDay()];

  // Find next class
  const nextClass = todayEntries.find((e) => timeToMinutes(e.start_time) > currentMinutes);
  const currentClass = todayEntries.find(
    (e) => timeToMinutes(e.start_time) <= currentMinutes && timeToMinutes(e.end_time) > currentMinutes
  );
  const allDone = todayEntries.length > 0 && !nextClass && !currentClass;

  function minutesUntil(time: string): number {
    return timeToMinutes(time) - currentMinutes;
  }

  function formatCountdown(minutes: number): string {
    if (minutes < 60) return `in ${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `in ${h}h ${m}m` : `in ${h}h`;
  }

  if (!isSchoolDay) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <p className="text-3xl mb-3">🎉</p>
        <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>No classes today!</p>
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          It&apos;s {dayName} — enjoy your day off
        </p>
      </div>
    );
  }

  if (todayEntries.length === 0) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <p className="text-3xl mb-3">✨</p>
        <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Free day!</p>
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          No classes scheduled for {dayName}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="rounded-2xl px-4 py-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {allDone
            ? "You're done for today! 🎉"
            : currentClass
            ? `In class right now — ${currentClass.course_name}`
            : `You have ${todayEntries.length} class${todayEntries.length !== 1 ? "es" : ""} today`}
        </p>
        {nextClass && (
          <p className="text-xs mt-1" style={{ color: "var(--accent)" }}>
            Next up: {nextClass.course_name} {formatCountdown(minutesUntil(nextClass.start_time))}
            {nextClass.location && ` — ${nextClass.location}`}
          </p>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {todayEntries.map((entry, idx) => {
          const startMin = timeToMinutes(entry.start_time);
          const endMin = timeToMinutes(entry.end_time);
          const isPast = endMin <= currentMinutes;
          const isCurrent = startMin <= currentMinutes && endMin > currentMinutes;
          const isNext = entry === nextClass;

          // Gap before this class
          const prevEnd = idx > 0 ? timeToMinutes(todayEntries[idx - 1].end_time) : null;
          const gap = prevEnd !== null ? startMin - prevEnd : null;

          return (
            <div key={entry.id}>
              {/* Free gap */}
              {gap !== null && gap > 0 && (
                <div className="flex items-center gap-3 py-2 pl-3">
                  <div className="w-8 text-center">
                    <div className="w-1.5 h-1.5 rounded-full mx-auto" style={{ background: "var(--border)" }} />
                  </div>
                  <p className="text-[11px] italic" style={{ color: "var(--text-tertiary)" }}>
                    Free {formatTime(todayEntries[idx - 1].end_time)} – {formatTime(entry.start_time)} ({gap} min)
                  </p>
                </div>
              )}

              {/* Class card */}
              <div
                className="flex gap-3 p-3 rounded-xl transition-all"
                style={{
                  opacity: isPast ? 0.5 : 1,
                  background: isCurrent ? entry.color + "10" : "transparent",
                  border: isCurrent ? `1px solid ${entry.color}40` : "1px solid transparent",
                }}
              >
                {/* Time column */}
                <div className="w-14 flex-shrink-0 text-right pt-0.5">
                  <p className="text-xs font-semibold" style={{ color: isCurrent ? entry.color : "var(--text-primary)" }}>
                    {formatTime(entry.start_time)}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                    {formatTime(entry.end_time)}
                  </p>
                </div>

                {/* Color bar */}
                <div className="w-1 rounded-full flex-shrink-0" style={{ background: entry.color, opacity: isPast ? 0.3 : 1 }} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                      {entry.course_name}
                    </p>
                    {isNext && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "var(--accent)", color: "#fff" }}>
                        NEXT
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: entry.color, color: "#fff" }}>
                        NOW
                      </span>
                    )}
                    {isPast && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "var(--bg-surface-alt)", color: "var(--text-tertiary)" }}>
                        Done
                      </span>
                    )}
                  </div>
                  {entry.professor_name && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      {entry.professor_name}
                    </p>
                  )}
                  {entry.location && (
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                      📍 {entry.location}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Done message */}
        {allDone && (
          <div className="text-center py-4">
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Last class ended at {formatTime(todayEntries[todayEntries.length - 1].end_time)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
