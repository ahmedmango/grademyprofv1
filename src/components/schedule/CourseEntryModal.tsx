"use client";

import { useState, useEffect, useRef } from "react";
import type { CourseEntry } from "@/lib/schedule-types";
import { BAHRAIN_DAYS, COURSE_COLORS, getNextColor, formatTime } from "@/lib/schedule-constants";

interface Props {
  entry: CourseEntry | null;
  usedColors: string[];
  onSave: (entry: Partial<CourseEntry>) => Promise<void>;
  onDelete?: () => void;
  onClose: () => void;
}

interface ProfessorSuggestion {
  id: string;
  name: string;
  slug: string;
  extra: {
    university?: string;
    avg_quality?: number;
    review_count?: number;
  };
}

export default function CourseEntryModal({ entry, usedColors, onSave, onDelete, onClose }: Props) {
  const isEdit = !!entry;
  const [saving, setSaving] = useState(false);

  const [courseName, setCourseName] = useState(entry?.course_name || "");
  const [section, setSection] = useState(entry?.section || "");
  const [professorName, setProfessorName] = useState(entry?.professor_name || "");
  const [professorId, setProfessorId] = useState<string | null>(entry?.professor_id || null);
  const [days, setDays] = useState<string[]>(entry?.days || []);
  const [startTime, setStartTime] = useState(entry?.start_time?.slice(0, 5) || "09:00");
  const [endTime, setEndTime] = useState(entry?.end_time?.slice(0, 5) || "10:00");
  const [location, setLocation] = useState(entry?.location || "");
  const [color, setColor] = useState(entry?.color || getNextColor(usedColors));
  const [creditHours, setCreditHours] = useState(entry?.credit_hours ?? 3);
  const [notes, setNotes] = useState(entry?.notes || "");
  const [showColors, setShowColors] = useState(false);

  // Professor auto-suggest
  const [profSuggestions, setProfSuggestions] = useState<ProfessorSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const profTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profTimeoutRef.current) clearTimeout(profTimeoutRef.current);
    if (professorName.length < 2) {
      setProfSuggestions([]);
      return;
    }
    // Don't search if we already selected a professor
    if (professorId) return;

    profTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(professorName)}&limit=5`);
        if (!res.ok) return;
        const data = await res.json();
        const profs = (data.results || []).filter((r: { result_type: string }) => r.result_type === "professor");
        setProfSuggestions(profs);
        setShowSuggestions(profs.length > 0);
      } catch {
        // ignore
      }
    }, 300);
  }, [professorName, professorId]);

  // Close suggestions on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggleDay = (day: string) => {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const handleSubmit = async () => {
    if (!courseName.trim()) return;
    if (days.length === 0) return;

    setSaving(true);
    try {
      await onSave({
        ...(isEdit ? { id: entry.id } : {}),
        course_name: courseName.trim(),
        section: section.trim() || null,
        professor_name: professorName.trim(),
        professor_id: professorId,
        days,
        start_time: startTime,
        end_time: endTime,
        location: location.trim() || null,
        color,
        credit_hours: creditHours,
        notes: notes.trim() || null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5 animate-slide-in"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
            {isEdit ? "Edit Course" : "Add Course"}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg transition-all active:scale-90" style={{ color: "var(--text-tertiary)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Course name */}
        <div className="mb-4">
          <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Course name *</label>
          <input
            type="text"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder="e.g. MATH 201 — Linear Algebra"
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{ background: "var(--bg-surface-alt)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
        </div>

        {/* Section */}
        <div className="mb-4">
          <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Section</label>
          <input
            type="text"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            placeholder="e.g. Section 3"
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{ background: "var(--bg-surface-alt)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
        </div>

        {/* Professor (with auto-suggest) */}
        <div className="mb-4 relative">
          <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Professor</label>
          <input
            type="text"
            value={professorName}
            onChange={(e) => {
              setProfessorName(e.target.value);
              if (professorId) setProfessorId(null);
            }}
            placeholder="Start typing to search..."
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{ background: "var(--bg-surface-alt)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
          {professorId && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--accent)" + "20", color: "var(--accent)" }}>
                Linked to GMP profile
              </span>
              <button
                onClick={() => setProfessorId(null)}
                className="text-[10px] underline"
                style={{ color: "var(--text-tertiary)" }}
              >
                unlink
              </button>
            </div>
          )}

          {/* Suggestions dropdown */}
          {showSuggestions && profSuggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-10 shadow-lg"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
            >
              {profSuggestions.map((prof) => (
                <button
                  key={prof.id}
                  onClick={() => {
                    setProfessorName(prof.name);
                    setProfessorId(prof.id);
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-surface-alt)] flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium" style={{ color: "var(--text-primary)" }}>{prof.name}</p>
                    <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{prof.extra?.university}</p>
                  </div>
                  {prof.extra?.avg_quality && (
                    <span className="text-xs font-bold" style={{
                      color: prof.extra.avg_quality >= 4 ? "var(--rating-high)" :
                        prof.extra.avg_quality >= 3 ? "var(--rating-mid)" : "var(--rating-low)"
                    }}>
                      {prof.extra.avg_quality}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Days (multi-select pills) */}
        <div className="mb-4">
          <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Days *</label>
          <div className="flex gap-2">
            {BAHRAIN_DAYS.map((day) => (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all active:scale-95"
                style={{
                  background: days.includes(day) ? color : "var(--bg-surface-alt)",
                  color: days.includes(day) ? "#fff" : "var(--text-secondary)",
                  border: `1px solid ${days.includes(day) ? color : "var(--border)"}`,
                }}
              >
                {day.charAt(0)}
              </button>
            ))}
          </div>
        </div>

        {/* Time pickers */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Start time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-surface-alt)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--text-secondary)" }}>End time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-surface-alt)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>
        </div>

        {/* Location */}
        <div className="mb-4">
          <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Building 5, Room 201"
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "var(--bg-surface-alt)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
        </div>

        {/* Credit hours + Color */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Credits</label>
            <select
              value={creditHours}
              onChange={(e) => setCreditHours(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-surface-alt)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            >
              {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n} credit{n !== 1 ? "s" : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Color</label>
            <button
              onClick={() => setShowColors(!showColors)}
              className="w-full px-3 py-2.5 rounded-xl text-sm flex items-center gap-2"
              style={{ background: "var(--bg-surface-alt)", border: "1px solid var(--border)" }}
            >
              <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: color }} />
              <span style={{ color: "var(--text-secondary)" }}>Change</span>
            </button>
          </div>
        </div>

        {/* Color palette */}
        {showColors && (
          <div className="flex flex-wrap gap-2 mb-4 p-3 rounded-xl" style={{ background: "var(--bg-surface-alt)" }}>
            {COURSE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => { setColor(c); setShowColors(false); }}
                className="w-8 h-8 rounded-full transition-all active:scale-90"
                style={{
                  background: c,
                  outline: c === color ? "2px solid var(--text-primary)" : "none",
                  outlineOffset: 2,
                }}
              />
            ))}
          </div>
        )}

        {/* Notes */}
        <div className="mb-5">
          <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--text-secondary)" }}>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any extra info..."
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
            style={{ background: "var(--bg-surface-alt)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {isEdit && onDelete && (
            <button
              onClick={onDelete}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
              style={{ background: "#FEE2E2", color: "#DC2626" }}
            >
              Delete
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={saving || !courseName.trim() || days.length === 0}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Course"}
          </button>
        </div>
      </div>
    </div>
  );
}
