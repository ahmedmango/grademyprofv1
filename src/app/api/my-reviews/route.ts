import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { NO_STORE_HEADERS } from "@/lib/api-headers";

export async function GET(req: NextRequest) {
  const anonUserHash = req.headers.get("x-anon-user-hash");
  const userId = req.headers.get("x-user-id");

  if (!anonUserHash || anonUserHash.length < 8)
    return NextResponse.json({ error: "Missing identity" }, { status: 400, headers: NO_STORE_HEADERS });

  const supabase = createServiceClient();
  const selectFields = `id, professor_id, course_id, rating_quality, rating_difficulty, would_take_again, grade_received, tags, comment, status, created_at, semester_window,
      professors ( name_en, slug ), courses ( code, title_en ), universities ( name_en )`;

  // Fetch by anon hash and by user_id (if logged in), then deduplicate
  const [hashResult, userResult] = await Promise.all([
    supabase.from("reviews").select(selectFields)
      .eq("anon_user_hash", anonUserHash)
      .order("created_at", { ascending: false }).limit(50),
    userId
      ? supabase.from("reviews").select(selectFields)
          .eq("user_id", userId)
          .order("created_at", { ascending: false }).limit(50)
      : Promise.resolve({ data: [], error: null }),
  ]);

  // Merge and deduplicate by id
  const seen = new Set<string>();
  const merged: any[] = [];
  for (const r of [...(hashResult.data || []), ...(userResult.data || [])]) {
    if (!seen.has(r.id)) { seen.add(r.id); merged.push(r); }
  }
  merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const error = hashResult.error;

  if (error) return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500, headers: NO_STORE_HEADERS });

  const mapped = merged.map((r: any) => ({
    ...r,
    display_status: r.status === "shadow" ? "live" : r.status,
    status_label: r.status === "live" || r.status === "shadow" ? "Published"
      : r.status === "pending" || r.status === "flagged" ? "Under Review"
      : "Rejected",
  }));

  // Count approved (live or shadow — shadow counts as approved for gate purposes)
  const approvedCount = merged.filter(
    (r: any) => r.status === "live" || r.status === "shadow"
  ).length;

  return NextResponse.json({
    reviews: mapped,
    count: mapped.length,
    approved_count: approvedCount,
  }, { headers: NO_STORE_HEADERS });
}
