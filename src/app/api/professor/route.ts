import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const supabase = createServerClient();

  const { data: professor, error } = await supabase
    .from("professors")
    .select(`
      id, name_en, name_ar, slug, photo_url,
      departments ( id, name_en ),
      universities ( id, name_en, slug ),
      aggregates_professor ( review_count, avg_quality, avg_difficulty, would_take_again_pct, rating_dist, tag_dist ),
      professor_courses ( courses ( id, code, title_en, slug ) )
    `)
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error || !professor) {
    return NextResponse.json({ error: "Professor not found" }, { status: 404 });
  }

  // Get live reviews
  const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const { data: reviews, count } = await supabase
    .from("reviews")
    .select("id, rating_quality, rating_difficulty, would_take_again, tags, comment, created_at, course_id", { count: "exact" })
    .eq("professor_id", professor.id)
    .eq("status", "live")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  return NextResponse.json({
    professor,
    reviews: reviews || [],
    total_reviews: count || 0,
    page,
    total_pages: Math.ceil((count || 0) / limit),
  });
}
