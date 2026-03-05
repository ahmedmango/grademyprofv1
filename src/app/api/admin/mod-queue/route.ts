import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateAdmin } from "@/lib/admin-auth";
import { NO_STORE_HEADERS } from "@/lib/api-headers";
import logger from "@/lib/logger";

export async function GET(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const supabase = createServiceClient();

  const status = req.nextUrl.searchParams.get("status") || "pending";
  const universityId = req.nextUrl.searchParams.get("university_id");
  const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
  const limit = 25;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("reviews")
    .select(`
      id, rating_quality, rating_difficulty, would_take_again,
      attendance_mandatory, uses_textbook, tags, comment, status,
      toxicity_score, risk_flags, created_at, semester_window, user_id, upvote_boost,
      anon_user_hash,
      professors ( id, name_en, slug ),
      courses ( id, code, title_en ),
      universities ( id, name_en, slug ),
      user_accounts ( id, username, email )
    `, { count: "exact" })
    .eq("status", status)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (universityId) {
    query = query.eq("university_id", universityId);
  }

  const { data: reviews, count, error } = await query;

  if (error) {
    logger.error("Mod queue error:", error);
    return NextResponse.json({ error: "Failed to fetch queue" }, { status: 500, headers: NO_STORE_HEADERS });
  }

  // Get counts per status for the dashboard
  const { data: statusCounts } = await supabase
    .rpc("get_review_status_counts");

  // If RPC doesn't exist, fetch all status counts in parallel (not sequentially)
  let counts = statusCounts;
  if (!counts) {
    const statuses = ["pending", "flagged", "live", "shadow", "removed"] as const;
    const results = await Promise.all(
      statuses.map((s) => supabase.from("reviews").select("*", { count: "exact", head: true }).eq("status", s))
    );
    counts = Object.fromEntries(statuses.map((s, i) => [s, results[i].count || 0]));
  }

  return NextResponse.json({
    reviews: reviews || [],
    total: count || 0,
    page,
    total_pages: Math.ceil((count || 0) / limit),
    status_counts: counts,
  }, { headers: NO_STORE_HEADERS });
}
