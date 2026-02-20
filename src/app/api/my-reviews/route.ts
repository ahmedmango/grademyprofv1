import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const anonUserHash = req.headers.get("x-anon-user-hash");
  if (!anonUserHash || anonUserHash.length < 8)
    return NextResponse.json({ error: "Missing identity" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: reviews, error } = await supabase.from("reviews")
    .select(`id, rating_quality, rating_difficulty, would_take_again, tags, comment, status, created_at, semester_window,
      professors ( name_en, slug ), courses ( code, title_en ), universities ( name_en )`)
    .eq("anon_user_hash", anonUserHash).neq("status", "removed")
    .order("created_at", { ascending: false }).limit(50);

  if (error) return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });

  const mapped = (reviews || []).map((r: any) => ({
    ...r,
    display_status: r.status === "shadow" ? "live" : r.status,
    status_label: r.status === "live" || r.status === "shadow" ? "Published"
      : r.status === "pending" || r.status === "flagged" ? "Under Review" : "Removed",
  }));

  return NextResponse.json({ reviews: mapped, count: mapped.length });
}
