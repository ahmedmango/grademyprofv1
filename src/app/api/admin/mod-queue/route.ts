import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      toxicity_score, risk_flags, created_at, semester_window,
      professors ( id, name_en, slug ),
      courses ( id, code, title_en ),
      universities ( id, name_en, slug )
    `, { count: "exact" })
    .eq("status", status)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (universityId) {
    query = query.eq("university_id", universityId);
  }

  const { data: reviews, count, error } = await query;

  if (error) {
    console.error("Mod queue error:", error);
    return NextResponse.json({ error: "Failed to fetch queue" }, { status: 500 });
  }

  // Get counts per status for the dashboard
  const { data: statusCounts } = await supabase
    .rpc("get_review_status_counts");

  // If RPC doesn't exist, do it manually
  let counts = statusCounts;
  if (!counts) {
    const statuses = ["pending", "flagged", "live", "shadow", "removed"];
    counts = {};
    for (const s of statuses) {
      const { count: c } = await supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .eq("status", s);
      counts[s] = c || 0;
    }
  }

  return NextResponse.json({
    reviews: reviews || [],
    total: count || 0,
    page,
    total_pages: Math.ceil((count || 0) / limit),
    status_counts: counts,
  });
}
