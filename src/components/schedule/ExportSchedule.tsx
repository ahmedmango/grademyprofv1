"use client";

import { useRef, useState } from "react";
import type { Schedule } from "@/lib/schedule-types";
import { BAHRAIN_DAYS, WESTERN_DAYS, formatTime, timeToMinutes } from "@/lib/schedule-constants";

interface Props {
  schedule: Schedule;
  onClose: () => void;
}

type ExportType = "wallpaper" | "share";

export default function ExportSchedule({ schedule, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [exportType, setExportType] = useState<ExportType>("wallpaper");
  const [generating, setGenerating] = useState(false);

  const days = schedule.week_start === "sun" ? BAHRAIN_DAYS : WESTERN_DAYS;
  const entries = schedule.course_entries;

  const generate = async () => {
    setGenerating(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isDark = document.documentElement.classList.contains("dark");

    // Dimensions
    const isWallpaper = exportType === "wallpaper";
    const W = isWallpaper ? 1170 : 1080;
    const H = isWallpaper ? 2532 : 1920;

    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Background gradient
    if (isDark) {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#0a0a0a");
      grad.addColorStop(0.5, "#111110");
      grad.addColorStop(1, "#1a1a18");
      ctx.fillStyle = grad;
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#F5F5F3");
      grad.addColorStop(0.5, "#FAFAF8");
      grad.addColorStop(1, "#F0F0EE");
      ctx.fillStyle = grad;
    }
    ctx.fillRect(0, 0, W, H);

    const textColor = isDark ? "#F5F5F3" : "#1A1A19";
    const mutedColor = isDark ? "#6A6A66" : "#8A8A86";
    const surfaceColor = isDark ? "#1C1C1A" : "#FFFFFF";
    const borderColor = isDark ? "#2A2A28" : "#E8E8E4";

    // Top padding for phone status bar
    const topPad = isWallpaper ? 180 : 80;
    let y = topPad;

    // Title
    ctx.font = "bold 42px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.fillText(schedule.semester_name, W / 2, y);
    y += 35;

    // Subtitle
    const totalCredits = entries.reduce((s, e) => s + e.credit_hours, 0);
    ctx.font = "400 22px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = mutedColor;
    ctx.fillText(`${entries.length} courses · ${totalCredits} credits`, W / 2, y);
    y += 50;

    // Calculate time range
    let minMin = Infinity, maxMin = -Infinity;
    for (const e of entries) {
      const s = timeToMinutes(e.start_time);
      const end = timeToMinutes(e.end_time);
      if (s < minMin) minMin = s;
      if (end > maxMin) maxMin = end;
    }
    if (entries.length === 0) { minMin = 480; maxMin = 1020; }
    const startHour = Math.floor(minMin / 60) - 1;
    const endHour = Math.ceil(maxMin / 60) + 1;
    const totalHours = endHour - startHour;

    // Grid dimensions
    const gridLeft = 80;
    const gridRight = W - 40;
    const gridTop = y;
    const gridBottom = H - (isWallpaper ? 200 : 100);
    const gridWidth = gridRight - gridLeft;
    const gridHeight = gridBottom - gridTop;
    const colWidth = gridWidth / days.length;
    const hourHeight = gridHeight / totalHours;

    // Day headers
    ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = mutedColor;
    ctx.textAlign = "center";
    for (let i = 0; i < days.length; i++) {
      ctx.fillText(days[i], gridLeft + i * colWidth + colWidth / 2, gridTop - 10);
    }

    // Time labels + grid lines
    ctx.textAlign = "right";
    ctx.font = "400 14px -apple-system, BlinkMacSystemFont, sans-serif";
    for (let i = 0; i <= totalHours; i++) {
      const lineY = gridTop + i * hourHeight;
      ctx.fillStyle = mutedColor;
      ctx.fillText(formatTime(`${(startHour + i).toString().padStart(2, "0")}:00`), gridLeft - 10, lineY + 5);

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(gridLeft, lineY);
      ctx.lineTo(gridRight, lineY);
      ctx.stroke();
    }

    // Column dividers
    for (let i = 0; i <= days.length; i++) {
      const x = gridLeft + i * colWidth;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, gridTop);
      ctx.lineTo(x, gridBottom);
      ctx.stroke();
    }

    // Course blocks
    for (const entry of entries) {
      for (const day of entry.days) {
        const dayIdx = days.indexOf(day);
        if (dayIdx === -1) continue;

        const startMin = timeToMinutes(entry.start_time);
        const endMin = timeToMinutes(entry.end_time);
        const blockTop = gridTop + ((startMin - startHour * 60) / (totalHours * 60)) * gridHeight;
        const blockHeight = ((endMin - startMin) / (totalHours * 60)) * gridHeight;
        const blockLeft = gridLeft + dayIdx * colWidth + 3;
        const blockWidth = colWidth - 6;

        // Block background
        ctx.fillStyle = entry.color + "30";
        roundRect(ctx, blockLeft, blockTop + 1, blockWidth, blockHeight - 2, 8);
        ctx.fill();

        // Left accent bar
        ctx.fillStyle = entry.color;
        roundRect(ctx, blockLeft, blockTop + 1, 4, blockHeight - 2, 2);
        ctx.fill();

        // Course name
        ctx.fillStyle = entry.color;
        ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.textAlign = "left";
        const maxTextWidth = blockWidth - 14;
        const courseTruncated = truncateText(ctx, entry.course_name, maxTextWidth);
        ctx.fillText(courseTruncated, blockLeft + 10, blockTop + 18);

        // Professor name
        if (blockHeight > 40 && entry.professor_name) {
          ctx.fillStyle = mutedColor;
          ctx.font = "400 11px -apple-system, BlinkMacSystemFont, sans-serif";
          const profTruncated = truncateText(ctx, entry.professor_name, maxTextWidth);
          ctx.fillText(profTruncated, blockLeft + 10, blockTop + 33);
        }

        // Location
        if (blockHeight > 55 && entry.location) {
          ctx.fillStyle = mutedColor;
          ctx.font = "400 10px -apple-system, BlinkMacSystemFont, sans-serif";
          ctx.fillText(truncateText(ctx, entry.location, maxTextWidth), blockLeft + 10, blockTop + 46);
        }
      }
    }

    // Footer
    ctx.fillStyle = mutedColor;
    ctx.font = "400 16px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("grademyprofessor.net", W / 2, H - (isWallpaper ? 100 : 40));

    // Download
    const link = document.createElement("a");
    link.download = `schedule-${schedule.semester_name.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();

    setGenerating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 animate-slide-in"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Export Schedule</h2>
          <button onClick={onClose} className="p-1" style={{ color: "var(--text-tertiary)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="space-y-3 mb-5">
          <button
            onClick={() => setExportType("wallpaper")}
            className="w-full p-4 rounded-xl text-left transition-all"
            style={{
              background: exportType === "wallpaper" ? "var(--accent)" + "10" : "var(--bg-surface-alt)",
              border: `1px solid ${exportType === "wallpaper" ? "var(--accent)" : "var(--border)"}`,
            }}
          >
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              📱 Phone Wallpaper
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              Perfect size for your lock screen (1170 x 2532)
            </p>
          </button>

          <button
            onClick={() => setExportType("share")}
            className="w-full p-4 rounded-xl text-left transition-all"
            style={{
              background: exportType === "share" ? "var(--accent)" + "10" : "var(--bg-surface-alt)",
              border: `1px solid ${exportType === "share" ? "var(--accent)" : "var(--border)"}`,
            }}
          >
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              💬 Share Card
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              Optimized for WhatsApp & Instagram Stories (1080 x 1920)
            </p>
          </button>
        </div>

        <button
          onClick={generate}
          disabled={generating || entries.length === 0}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          {generating ? "Generating..." : "Download PNG"}
        </button>

        {entries.length === 0 && (
          <p className="text-xs text-center mt-2" style={{ color: "var(--text-tertiary)" }}>
            Add some courses first!
          </p>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + "…").width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "…";
}
