import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { NO_STORE_HEADERS } from "@/lib/api-headers";

export async function GET(req: NextRequest) {
  const anonUserHash = req.headers.get("x-anon-user-hash");
  if (!anonUserHash || anonUserHash.length < 8)
    return NextResponse.json({ error: "Missing identity" }, { status: 400, headers: NO_STORE_HEADERS });

  const supabase = createServiceClient();
  const { data: reviews, error } = await supabase.from("reviews")
    .select(`id, professor_id, course_id, rating_quality, rating_difficulty, would_take_again, grade_received, tags, comment, status, created_at, semester_window,
      professors ( name_en, slug ), courses ( code, title_en ), universities ( name_en )`)
    .eq("anon_user_hash", anonUserHash)
    .order("created_at", { ascending: false }).limit(50);

  if (error) return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500, headers: NO_STORE_HEADERS });

  const mapped = (reviews || []).map((r: any) => ({
    ...r,
    display_status: r.status === "shadow" ? "live" : r.status,
    status_label: r.status === "live" || r.status === "shadow" ? "Published"
      : r.status === "pending" || r.status === "flagged" ? "Under Review"
      : "Rejected",
  }));

  // Count approved (live or shadow — shadow counts as approved for gate purposes)
  const approvedCount = (reviews || []).filter(
    (r: any) => r.status === "live" || r.status === "shadow"
  ).length;

  return NextResponse.json({
    reviews: mapped,
    count: mapped.length,
    approved_count: approvedCount,
  }, { headers: NO_STORE_HEADERS });
}
