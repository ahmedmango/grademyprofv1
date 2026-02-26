import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  const checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {};

  // Database ping — pull one row from a table we know always exists
  try {
    const supabase = createServiceClient();
    const t0 = Date.now();
    const { error } = await supabase.from("universities").select("id").limit(1);
    checks.database = error
      ? { ok: false, error: error.message }
      : { ok: true, latencyMs: Date.now() - t0 };
  } catch (e) {
    checks.database = { ok: false, error: String(e) };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      uptimeMs: process.uptime ? Math.round(process.uptime() * 1000) : null,
      totalLatencyMs: Date.now() - start,
      checks,
    },
    {
      status: allOk ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
