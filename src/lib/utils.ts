export function qualityColor(v: number): string {
  return v >= 4 ? "#16A34A" : v >= 3 ? "#CA8A04" : "#DC2626";
}

export function qualityBg(v: number): string {
  return v >= 4 ? "#ECFDF5" : v >= 3 ? "#FEFCE8" : "#FEF2F2";
}

export function difficultyColor(v: number): string {
  return v >= 4 ? "#DC2626" : v >= 3 ? "#CA8A04" : "#16A34A";
}

export function qualityLabel(v: number): string {
  if (v >= 4.5) return "Excellent";
  if (v >= 3.5) return "Great";
  if (v >= 2.5) return "Average";
  if (v >= 1.5) return "Poor";
  return "Awful";
}

export function fmtRating(v: number): string {
  return Number(v).toFixed(1);
}

export function getCurrentSemester(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  if (month >= 1 && month <= 5) return `${year}-spring`;
  if (month >= 6 && month <= 8) return `${year}-summer`;
  return `${year}-fall`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
