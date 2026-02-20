"use client";

const GRADES = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F", "W", "IP"];

export default function GradeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (grade: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
        Grade Received *
      </label>
      <div className="flex flex-wrap gap-1.5">
        {GRADES.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => onChange(g)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              value === g
                ? "text-white"
                : "border"
            }`}
            style={
              value === g
                ? { background: "var(--accent)" }
                : { borderColor: "var(--border)", color: "var(--text-secondary)", background: "var(--bg-surface)" }
            }
          >
            {g}
          </button>
        ))}
      </div>
    </div>
  );
}
