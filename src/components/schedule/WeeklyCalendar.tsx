"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import type { CourseEntry } from "@/lib/schedule-types";
import { BAHRAIN_DAYS, WESTERN_DAYS, DAY_LABELS, formatTime, timeToMinutes } from "@/lib/schedule-constants";

interface Props {
  entries: CourseEntry[];
  weekStart: "sun" | "mon";
  onEntryClick: (entry: CourseEntry) => void;
}

function getRatingColor(professorId: string | null): string | null {
  // Rating badge handled separately if professor is linked
  // For now, return null — could be enhanced with aggregates data
  if (!professorId) return null;
  return "gray";
}

export default function WeeklyCalendar({ entries, weekStart, onEntryClick }: Props) {
  const days = weekStart === "sun" ? BAHRAIN_DAYS : WESTERN_DAYS;
  const scrollRef = useRef<HTMLDivElement>(null);
  const nowLineRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Calculate visible time range (auto-zoom to fit classes)
  const { startHour, endHour } = useMemo(() => {
    if (entries.length === 0) return { startHour: 8, endHour: 17 };
    let minMin = Infinity, maxMin = -Infinity;
    for (const e of entries) {
      const s = timeToMinutes(e.start_time);
      const end = timeToMinutes(e.end_time);
      if (s < minMin) minMin = s;
      if (end > maxMin) maxMin = end;
    }
    return {
      startHour: Math.max(7, Math.floor(minMin / 60) - 1),
      endHour: Math.min(21, Math.ceil(maxMin / 60) + 1),
    };
  }, [entries]);

  const totalHours = endHour - startHour;
  const HOUR_HEIGHT = 64; // px per hour
  const gridHeight = totalHours * HOUR_HEIGHT;

  // Conflict detection
  const conflicts = useMemo(() => {
    const conflictIds = new Set<string>();
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i], b = entries[j];
        const sharedDay = a.days.some((d) => b.days.includes(d));
        if (!sharedDay) continue;
        const aStart = timeToMinutes(a.start_time), aEnd = timeToMinutes(a.end_time);
        const bStart = timeToMinutes(b.start_time), bEnd = timeToMinutes(b.end_time);
        if (aStart < bEnd && bStart < aEnd) {
          conflictIds.add(a.id);
          conflictIds.add(b.id);
        }
      }
    }
    return conflictIds;
  }, [entries]);

  // Day load (total minutes of classes per day)
  const dayLoad = useMemo(() => {
    const load: Record<string, number> = {};
    for (const day of [...BAHRAIN_DAYS, ...WESTERN_DAYS]) load[day] = 0;
    for (const e of entries) {
      const duration = timeToMinutes(e.end_time) - timeToMinutes(e.start_time);
      for (const d of e.days) load[d] += duration;
    }
    return load;
  }, [entries]);

  const maxLoad = Math.max(...Object.values(dayLoad), 1);

  // Scroll to first class on mount
  useEffect(() => {
    if (scrollRef.current && entries.length > 0) {
      const firstStart = Math.min(...entries.map((e) => timeToMinutes(e.start_time)));
      const offset = ((firstStart / 60 - startHour) * HOUR_HEIGHT) - 20;
      scrollRef.current.scrollTop = Math.max(0, offset);
    }
  }, [entries, startHour]);

  // Current time position
  const todayDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][currentTime.getDay()];
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const showNowLine = days.includes(todayDay) &&
    currentMinutes >= startHour * 60 && currentMinutes <= endHour * 60;
  const nowPosition = ((currentMinutes - startHour * 60) / (totalHours * 60)) * gridHeight;

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <p className="text-3xl mb-3">📋</p>
        <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>No courses yet</p>
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          Tap &quot;Add Course&quot; to start building your schedule
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      {/* Conflict warning */}
      {conflicts.size > 0 && (
        <div className="px-4 py-2 text-xs font-medium flex items-center gap-2" style={{ background: "#FEF2F2", color: "#DC2626", borderBottom: "1px solid #FECACA" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          {conflicts.size / 2} time conflict{conflicts.size > 2 ? "s" : ""} detected
        </div>
      )}

      {/* Day headers with load indicator */}
      <div className="grid border-b" style={{ gridTemplateColumns: `48px repeat(${days.length}, 1fr)`, borderColor: "var(--border)" }}>
        <div className="p-2" />
        {days.map((day) => (
          <div key={day} className="text-center py-2 border-l" style={{ borderColor: "var(--border)" }}>
            <span className={`text-xs font-semibold ${todayDay === day ? "" : ""}`} style={{ color: todayDay === day ? "var(--accent)" : "var(--text-secondary)" }}>
              {day}
            </span>
            {/* Day load bar */}
            <div className="mx-auto mt-1 h-1 rounded-full" style={{ width: "70%", background: "var(--bg-surface-alt)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(dayLoad[day] / maxLoad) * 100}%`,
                  background: dayLoad[day] > 0 ? "var(--accent)" : "transparent",
                  opacity: 0.6,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div ref={scrollRef} className="overflow-y-auto overflow-x-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
        <div className="relative grid" style={{ gridTemplateColumns: `48px repeat(${days.length}, 1fr)`, height: gridHeight }}>
          {/* Time labels */}
          {Array.from({ length: totalHours }, (_, i) => (
            <div
              key={i}
              className="absolute left-0 w-12 text-right pr-2 text-[10px] -translate-y-1/2"
              style={{ top: i * HOUR_HEIGHT, color: "var(--text-tertiary)" }}
            >
              {formatTime(`${(startHour + i).toString().padStart(2, "0")}:00`)}
            </div>
          ))}

          {/* Hour grid lines */}
          {Array.from({ length: totalHours }, (_, i) => (
            <div
              key={`line-${i}`}
              className="absolute border-t"
              style={{ top: i * HOUR_HEIGHT, left: 48, right: 0, borderColor: "var(--border)", opacity: 0.5 }}
            />
          ))}

          {/* Day column separators */}
          {days.map((_, i) => (
            <div
              key={`col-${i}`}
              className="absolute top-0 bottom-0 border-l"
              style={{ left: `calc(48px + ${(i / days.length) * 100}% * ${days.length} / ${days.length})`, borderColor: "var(--border)", opacity: 0.3 }}
            />
          ))}

          {/* Now line */}
          {showNowLine && (
            <div
              ref={nowLineRef}
              className="absolute z-10 pointer-events-none"
              style={{ top: nowPosition, left: 48, right: 0 }}
            >
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full" style={{ background: "#EF4444" }} />
                <div className="flex-1 h-[2px]" style={{ background: "#EF4444" }} />
              </div>
            </div>
          )}

          {/* Course blocks */}
          {entries.map((entry) =>
            entry.days.map((day) => {
              const dayIdx = days.indexOf(day);
              if (dayIdx === -1) return null;

              const startMin = timeToMinutes(entry.start_time);
              const endMin = timeToMinutes(entry.end_time);
              const top = ((startMin - startHour * 60) / (totalHours * 60)) * gridHeight;
              const height = ((endMin - startMin) / (totalHours * 60)) * gridHeight;
              const colWidth = `calc((100% - 48px) / ${days.length})`;
              const left = `calc(48px + ${dayIdx} * ${colWidth})`;
              const isConflict = conflicts.has(entry.id);
              const ratingDot = getRatingColor(entry.professor_id);

              return (
                <button
                  key={`${entry.id}-${day}`}
                  onClick={() => onEntryClick(entry)}
                  className="absolute rounded-lg p-1.5 text-left overflow-hidden transition-all hover:brightness-95 active:scale-[0.98] cursor-pointer"
                  style={{
                    top: top + 1,
                    height: height - 2,
                    left,
                    width: `calc(${colWidth} - 4px)`,
                    marginLeft: 2,
                    background: entry.color + "20",
                    borderLeft: `3px solid ${entry.color}`,
                    outline: isConflict ? "2px solid #EF4444" : "none",
                    outlineOffset: -1,
                  }}
                >
                  <p className="text-[10px] font-bold leading-tight truncate" style={{ color: entry.color }}>
                    {entry.course_name}
                  </p>
                  {height > 40 && (
                    <p className="text-[9px] leading-tight truncate mt-0.5 flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
                      {ratingDot && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: ratingDot === "gray" ? "#9CA3AF" : ratingDot }} />
                      )}
                      {entry.professor_name}
                    </p>
                  )}
                  {height > 56 && entry.location && (
                    <p className="text-[8px] leading-tight truncate mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                      {entry.location}
                    </p>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
