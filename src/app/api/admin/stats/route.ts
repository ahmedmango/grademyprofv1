import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();

  // Status counts
  const statuses = ["pending", "flagged", "live", "shadow", "removed"];
  const statusCounts: Record<string, number> = {};
  for (const s of statuses) {
    const { count } = await supabase
      .from("reviews").select("*", { count: "exact", head: true }).eq("status", s);
    statusCounts[s] = count || 0;
  }

  // Reviews today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count: reviewsToday } = await supabase
    .from("reviews").select("*", { count: "exact", head: true })
    .gte("created_at", today.toISOString());

  // Top professors by review count
  const { data: topProfessors } = await supabase
    .from("aggregates_professor")
    .select("professor_id, review_count, avg_quality, professors ( name_en, slug )")
    .order("review_count", { ascending: false })
    .limit(10);

  // University distribution
  const { data: uniDist } = await supabase
    .from("reviews")
    .select("university_id, universities ( name_en )")
    .limit(1000);

  const uniCounts: Record<string, number> = {};
  (uniDist || []).forEach((r: any) => {
    const name = r.universities?.name_en || "Unknown";
    uniCounts[name] = (uniCounts[name] || 0) + 1;
  });

  return NextResponse.json({
    status_counts: statusCounts,
    reviews_today: reviewsToday || 0,
    total_reviews: Object.values(statusCounts).reduce((a, b) => a + b, 0),
    top_professors: topProfessors || [],
    university_distribution: uniCounts,
  });
}
