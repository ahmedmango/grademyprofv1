import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { NO_STORE_HEADERS } from "@/lib/api-headers";
import logger from "@/lib/logger";

const VALID_REASONS = ["spam", "offensive", "inaccurate", "doxxing", "other"] as const;

const MAX_REPORTS_PER_DAY = 10;
const MAX_REPORTS_PER_IP_HOUR = 5;

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash = (hash << 5) - hash + str.charCodeAt(i); hash |= 0; }
  return Math.abs(hash).toString(36);
}

export async function POST(req: NextRequest) {
  try {
    const { review_id, reason, detail } = await req.json();
    if (!review_id || !reason) return NextResponse.json({ error: "Missing review_id or reason" }, { status: 400, headers: NO_STORE_HEADERS });
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(review_id)) return NextResponse.json({ error: "Invalid review_id" }, { status: 400, headers: NO_STORE_HEADERS });
    if (!VALID_REASONS.includes(reason)) return NextResponse.json({ error: "Invalid reason" }, { status: 400, headers: NO_STORE_HEADERS });

    const anonUserHash = req.headers.get("x-anon-user-hash") || "";
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = hashString(clientIp);

    const supabase = createServiceClient();

    // Rate limiting — same pattern as review/route.ts
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

    const [review, userDayResult, ipHourResult] = await Promise.all([
      supabase.from("reviews").select("id").eq("id", review_id).eq("status", "live").single(),
      anonUserHash.length >= 8
        ? supabase.from("rate_limits").select("*", { count: "exact", head: true })
            .eq("anon_user_hash", anonUserHash).eq("action", "report").gte("created_at", oneDayAgo)
        : { count: 0 },
      supabase.from("rate_limits").select("*", { count: "exact", head: true })
        .eq("ip_hash", ipHash).eq("action", "report").gte("created_at", oneHourAgo),
    ]);

    if (!review.data) return NextResponse.json({ error: "Review not found" }, { status: 404, headers: NO_STORE_HEADERS });

    if ((userDayResult.count || 0) >= MAX_REPORTS_PER_DAY)
      return NextResponse.json({ error: "Daily report limit reached. Try again tomorrow." }, { status: 429, headers: NO_STORE_HEADERS });
    if ((ipHourResult.count || 0) >= MAX_REPORTS_PER_IP_HOUR)
      return NextResponse.json({ error: "Too many reports from this network." }, { status: 429, headers: NO_STORE_HEADERS });

    const { error: rpcError } = await supabase.rpc("insert_report_and_maybe_flag", {
      p_review_id: review_id,
      p_reason: reason,
      p_detail: (detail || "").trim().slice(0, 500),
    });
    if (rpcError) {
      logger.error("[report] insert_report_and_maybe_flag failed:", rpcError);
      return NextResponse.json({ error: "Failed to submit report" }, { status: 500, headers: NO_STORE_HEADERS });
    }

    // Record rate limit entry
    await supabase.from("rate_limits").insert({
      anon_user_hash: anonUserHash || ipHash,
      ip_hash: ipHash,
      action: "report",
    });

    return NextResponse.json({ success: true, message: "Thank you for reporting. Our team will review this." }, { status: 201, headers: NO_STORE_HEADERS });
  } catch (err) {
    logger.error("[report] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
