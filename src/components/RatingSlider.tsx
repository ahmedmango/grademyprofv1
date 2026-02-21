"use client";

/**
 * Color-coded segmented rating slider (like RateMyProfessor)
 * Shows 5 segments, filled proportionally based on the rating value
 * 
 * For QUALITY: 5=green, 1=red (higher is better)
 * For DIFFICULTY: 5=red, 1=green (lower is better, inverted)
 */

const QUALITY_COLORS = [
  "#EF4444", // 1 - red (awful)
  "#F97316", // 2 - orange
  "#EAB308", // 3 - yellow
  "#84CC16", // 4 - lime
  "#22C55E", // 5 - green (awesome)
];

const DIFFICULTY_COLORS = [
  "#22C55E", // 1 - green (easy)
  "#84CC16", // 2 - lime
  "#EAB308", // 3 - yellow
  "#F97316", // 4 - orange
  "#EF4444", // 5 - red (hard)
];

export default function RatingSlider({
  value,
  type = "quality",
  size = "md",
  showLabel = true,
  label,
}: {
  value: number;
  type?: "quality" | "difficulty";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  label?: string;
}) {
  const colors = type === "quality" ? QUALITY_COLORS : DIFFICULTY_COLORS;
  const filledSegments = Math.round(value);
  
  // Get the color for the current value
  const activeColor = colors[Math.min(Math.max(filledSegments - 1, 0), 4)];
  
  const heights: Record<string, string> = { sm: "h-2", md: "h-3", lg: "h-4" };
  const h = heights[size];
  const gaps: Record<string, string> = { sm: "gap-0.5", md: "gap-1", lg: "gap-1.5" };
  const g = gaps[size];
  
  const labelText = type === "quality"
    ? (value >= 4.5 ? "Awesome" : value >= 3.5 ? "Great" : value >= 2.5 ? "Good" : value >= 1.5 ? "OK" : "Awful")
    : (value >= 4.5 ? "Very Hard" : value >= 3.5 ? "Hard" : value >= 2.5 ? "Average" : value >= 1.5 ? "Easy" : "Very Easy");

  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="text-[10px] font-semibold uppercase tracking-wider min-w-[52px]" style={{ color: "var(--text-tertiary)" }}>
          {label}
        </span>
      )}
      <div className={`flex ${g} flex-1`}>
        {[1, 2, 3, 4, 5].map((seg) => (
          <div
            key={seg}
            className={`${h} flex-1 rounded-full transition-all duration-300`}
            style={{
              backgroundColor: seg <= filledSegments ? activeColor : "var(--border)",
              opacity: seg <= filledSegments ? 1 : 0.4,
            }}
          />
        ))}
      </div>
      <span
        className="text-sm font-extrabold font-display min-w-[28px] text-right"
        style={{ color: activeColor }}
      >
        {value.toFixed(1)}
      </span>
      {showLabel && (
        <span className="text-[10px] min-w-[48px]" style={{ color: "var(--text-tertiary)" }}>
          {labelText}
        </span>
      )}
    </div>
  );
}
