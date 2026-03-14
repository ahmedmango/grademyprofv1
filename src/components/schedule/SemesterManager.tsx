"use client";

import { useState } from "react";
import type { Schedule } from "@/lib/schedule-types";

interface Props {
  schedules: Schedule[];
  activeId: string;
  onSwitch: (id: string) => Promise<void>;
  onCreate: (name: string) => Promise<void>;
  onDuplicate: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

export default function SemesterManager({ schedules, activeId, onSwitch, onCreate, onDuplicate, onDelete, onClose }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await onCreate(newName.trim());
    setNewName("");
    setShowCreate(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full sm:max-w-sm max-h-[80vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5 animate-slide-in"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Semesters</h2>
          <button onClick={onClose} className="p-1" style={{ color: "var(--text-tertiary)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="space-y-2 mb-4">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="flex items-center justify-between p-3 rounded-xl transition-all"
              style={{
                background: schedule.id === activeId ? "var(--accent)" + "10" : "var(--bg-surface-alt)",
                border: schedule.id === activeId ? `1px solid var(--accent)` : "1px solid var(--border)",
              }}
            >
              <button
                onClick={() => onSwitch(schedule.id)}
                className="flex-1 text-left"
              >
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {schedule.semester_name}
                  {schedule.id === activeId && (
                    <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "var(--accent)", color: "#fff" }}>
                      ACTIVE
                    </span>
                  )}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                  {schedule.course_entries.length} course{schedule.course_entries.length !== 1 ? "s" : ""}
                </p>
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onDuplicate(schedule.id)}
                  className="p-1.5 rounded-lg transition-all active:scale-90"
                  style={{ color: "var(--text-tertiary)" }}
                  title="Duplicate"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
                {schedules.length > 1 && (
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${schedule.semester_name}"? This can't be undone.`)) {
                        onDelete(schedule.id);
                      }
                    }}
                    className="p-1.5 rounded-lg transition-all active:scale-90"
                    style={{ color: "#EF4444" }}
                    title="Delete"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {showCreate ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Fall 2026"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-surface-alt)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
            <button
              onClick={handleCreate}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Create
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5"
            style={{ background: "var(--bg-surface-alt)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Semester
          </button>
        )}
      </div>
    </div>
  );
}
