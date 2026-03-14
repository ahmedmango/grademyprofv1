"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/components/UserProvider";
import Link from "next/link";
import type { Schedule, CourseEntry } from "@/lib/schedule-types";
import { COURSE_COLORS, getNextColor } from "@/lib/schedule-constants";
import WeeklyCalendar from "@/components/schedule/WeeklyCalendar";
import TodayView from "@/components/schedule/TodayView";
import CourseEntryModal from "@/components/schedule/CourseEntryModal";
import SemesterManager from "@/components/schedule/SemesterManager";
import ExportSchedule from "@/components/schedule/ExportSchedule";

type Tab = "week" | "today";

export default function SchedulePage() {
  const { user, loading: userLoading } = useUser();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("week");
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CourseEntry | null>(null);
  const [showSemesterManager, setShowSemesterManager] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const activeSchedule = schedules.find((s) => s.is_active) || schedules[0] || null;

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await fetch("/api/schedule");
      if (!res.ok) return;
      const data = await res.json();
      setSchedules(data.schedules || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchSchedules();
    else setLoading(false);
  }, [user, fetchSchedules]);

  const createSchedule = async (semesterName?: string) => {
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ semester_name: semesterName || "Spring 2026" }),
    });
    if (!res.ok) return;
    await fetchSchedules();
  };

  const addOrUpdateEntry = async (entry: Partial<CourseEntry>) => {
    const isEdit = !!entry.id;
    const url = "/api/schedule/entries";
    const method = isEdit ? "PUT" : "POST";

    const body = isEdit
      ? { ...entry, schedule_id: activeSchedule!.id }
      : {
          ...entry,
          schedule_id: activeSchedule!.id,
          color: entry.color || getNextColor(activeSchedule!.course_entries.map((e) => e.color)),
        };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Failed to save");
      return;
    }
    await fetchSchedules();
    setShowAddCourse(false);
    setEditingEntry(null);
  };

  const deleteEntry = async (entryId: string) => {
    const res = await fetch("/api/schedule/entries", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: entryId, schedule_id: activeSchedule!.id }),
    });
    if (!res.ok) return;
    await fetchSchedules();
  };

  // Auth gate
  if (userLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 mx-auto rounded-lg" style={{ background: "var(--bg-surface-alt)" }} />
          <div className="h-64 rounded-2xl" style={{ background: "var(--bg-surface-alt)" }} />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-4xl mb-4">📅</div>
        <h1 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          Your Schedule
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          Sign in to build and manage your class schedule. It&apos;s free and takes 10 seconds.
        </p>
        <Link
          href="/auth"
          className="inline-block px-6 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          Sign in to get started
        </Link>
      </div>
    );
  }

  // No schedules yet — create first one
  if (!activeSchedule) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-4xl mb-4">📅</div>
        <h1 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          Build Your Schedule
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          Add your courses and see your week at a glance. You can even export it as a phone wallpaper!
        </p>
        <button
          onClick={() => createSchedule()}
          className="px-6 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          Create my schedule
        </button>
      </div>
    );
  }

  const totalCredits = activeSchedule.course_entries.reduce((sum, e) => sum + e.credit_hours, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <button
            onClick={() => setShowSemesterManager(true)}
            className="text-lg font-bold flex items-center gap-1.5 transition-opacity hover:opacity-80"
            style={{ color: "var(--text-primary)" }}
          >
            {activeSchedule.semester_name}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            {activeSchedule.course_entries.length} course{activeSchedule.course_entries.length !== 1 ? "s" : ""} &middot; {totalCredits} credits
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExport(true)}
            className="p-2 rounded-lg transition-all active:scale-95"
            style={{ background: "var(--bg-surface-alt)", border: "1px solid var(--border)" }}
            title="Export schedule"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-secondary)" }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          <button
            onClick={() => setShowAddCourse(true)}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center gap-1.5"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Course
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-4" style={{ background: "var(--bg-surface-alt)" }}>
        {(["week", "today"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2 text-xs font-semibold rounded-lg transition-all"
            style={{
              background: activeTab === tab ? "var(--bg-surface)" : "transparent",
              color: activeTab === tab ? "var(--text-primary)" : "var(--text-tertiary)",
              boxShadow: activeTab === tab ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {tab === "week" ? "Week View" : "Today"}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "week" ? (
        <WeeklyCalendar
          entries={activeSchedule.course_entries}
          weekStart={activeSchedule.week_start}
          onEntryClick={(entry) => setEditingEntry(entry)}
        />
      ) : (
        <TodayView
          entries={activeSchedule.course_entries}
          weekStart={activeSchedule.week_start}
        />
      )}

      {/* Add/Edit Modal */}
      {(showAddCourse || editingEntry) && (
        <CourseEntryModal
          entry={editingEntry}
          usedColors={activeSchedule.course_entries.map((e) => e.color)}
          onSave={addOrUpdateEntry}
          onDelete={editingEntry ? () => { deleteEntry(editingEntry.id); setEditingEntry(null); } : undefined}
          onClose={() => { setShowAddCourse(false); setEditingEntry(null); }}
        />
      )}

      {/* Semester Manager */}
      {showSemesterManager && (
        <SemesterManager
          schedules={schedules}
          activeId={activeSchedule.id}
          onSwitch={async (id) => {
            await fetch("/api/schedule", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id, is_active: true }),
            });
            await fetchSchedules();
            setShowSemesterManager(false);
          }}
          onCreate={async (name) => {
            await createSchedule(name);
            setShowSemesterManager(false);
          }}
          onDuplicate={async (id) => {
            const source = schedules.find((s) => s.id === id);
            if (!source) return;
            await createSchedule(source.semester_name + " (copy)");
            await fetchSchedules();
            const newSchedule = schedules.find((s) => s.is_active && s.id !== id);
            if (newSchedule) {
              for (const entry of source.course_entries) {
                await fetch("/api/schedule/entries", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    schedule_id: newSchedule.id,
                    course_name: entry.course_name,
                    section: entry.section,
                    professor_name: entry.professor_name,
                    professor_id: entry.professor_id,
                    days: entry.days,
                    start_time: entry.start_time,
                    end_time: entry.end_time,
                    location: entry.location,
                    color: entry.color,
                    credit_hours: entry.credit_hours,
                    notes: entry.notes,
                  }),
                });
              }
            }
            await fetchSchedules();
            setShowSemesterManager(false);
          }}
          onDelete={async (id) => {
            await fetch("/api/schedule", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id }),
            });
            await fetchSchedules();
            setShowSemesterManager(false);
          }}
          onClose={() => setShowSemesterManager(false)}
        />
      )}

      {/* Export Modal */}
      {showExport && (
        <ExportSchedule
          schedule={activeSchedule}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
