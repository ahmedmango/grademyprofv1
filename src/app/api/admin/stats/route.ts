import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();

  const { data: statusCounts } = await supabase.rpc("get_review_status_counts");

  let counts = statusCounts;
  if (!counts || typeof counts !== "object") {
    const statuses = ["pending", "flagged", "live", "shadow", "removed"];
    const results = await Promise.all(
      statuses.map((s) => supabase.from("reviews").select("*", { count: "exact", head: true }).eq("status", s))
    );
    counts = {};
    statuses.forEach((s, i) => { counts[s] = results[i].count || 0; });
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const { count: reviewsToday } = await supabase.from("reviews").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString());

  const { data: topProfessors } = await supabase.from("aggregates_professor")
    .select("professor_id, review_count, avg_quality, professors ( name_en, slug )")
    .order("review_count", { ascending: false }).limit(10);

  return NextResponse.json({
    status_counts: counts,
    reviews_today: reviewsToday || 0,
    total_reviews: Object.values(counts as Record<string, number>).reduce((a: number, b: number) => a + b, 0),
    top_professors: topProfessors || [],
  });
}
