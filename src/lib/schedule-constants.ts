// Curated accessible color palette for course blocks
// Chosen for: vibrancy, distinguishability (including colorblind), good contrast on white & dark
export const COURSE_COLORS = [
  "#7C3AED", // violet
  "#2563EB", // blue
  "#059669", // emerald
  "#D97706", // amber
  "#DC2626", // red
  "#DB2777", // pink
  "#0891B2", // cyan
  "#4F46E5", // indigo
  "#65A30D", // lime
  "#9333EA", // purple
  "#EA580C", // orange
  "#0D9488", // teal
] as const;

export const BAHRAIN_DAYS: string[] = ["Sun", "Mon", "Tue", "Wed", "Thu"];
export const WESTERN_DAYS: string[] = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export const DAY_LABELS: Record<string, string> = {
  Sun: "Sunday",
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
};

export const TIME_SLOTS = Array.from({ length: 15 }, (_, i) => {
  const hour = i + 7; // 7:00 AM to 9:00 PM
  return `${hour.toString().padStart(2, "0")}:00`;
});

export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function getNextColor(usedColors: string[]): string {
  const available = COURSE_COLORS.filter((c) => !usedColors.includes(c));
  return available.length > 0 ? available[0] : COURSE_COLORS[usedColors.length % COURSE_COLORS.length];
}
