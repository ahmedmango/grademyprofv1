"use client";

const LETTER_GRADES = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F", "W", "IP"];
const CLASSIFICATION_GRADES = ["Distinction", "Merit", "Pass", "Fail"];

export default function GradeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (grade: string) => void;
}) {
  const btn = (g: string) => (
    <button
      key={g}
      type="button"
      onClick={() => onChange(g)}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${value === g ? "text-white" : "border"}`}
      style={value === g ? { background: "var(--accent)" } : { borderColor: "var(--border)", color: "var(--text-secondary)", background: "var(--bg-surface)" }}
    >
      {g}
    </button>
  );

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
          Letter Grade *
        </label>
        <div className="flex flex-wrap gap-1.5">
          {LETTER_GRADES.map(btn)}
        </div>
      </div>
      <div>
        <div className="h-px w-full mb-3" style={{ background: "var(--border)" }} />
        <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
          Or Classification Grade
        </label>
        <div className="flex flex-wrap gap-1.5">
          {CLASSIFICATION_GRADES.map(btn)}
        </div>
      </div>
    </div>
  );
}
