import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const sort = req.nextUrl.searchParams.get("sort") || "newest";
  const courseId = req.nextUrl.searchParams.get("course") || null;
  const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const supabase = createServerClient();

  const { data: professor, error } = await supabase
    .from("professors")
    .select(`id, name_en, name_ar, slug, photo_url,
      departments ( id, name_en ), universities ( id, name_en, slug ),
      aggregates_professor ( review_count, avg_quality, avg_difficulty, would_take_again_pct, rating_dist, tag_dist, top_tags ),
      professor_courses ( courses ( id, code, title_en, slug ) )`)
    .eq("slug", slug).eq("is_active", true).single();

  if (error || !professor) return NextResponse.json({ error: "Professor not found" }, { status: 404 });

  let reviewQuery = supabase
    .from("reviews")
    .select("id, rating_quality, rating_difficulty, would_take_again, tags, comment, grade_received, created_at, course_id, courses ( code, title_en )", { count: "exact" })
    .eq("professor_id", professor.id).eq("status", "live");

  if (courseId) reviewQuery = reviewQuery.eq("course_id", courseId);

  switch (sort) {
    case "oldest": reviewQuery = reviewQuery.order("created_at", { ascending: true }); break;
    case "highest": reviewQuery = reviewQuery.order("rating_quality", { ascending: false }); break;
    case "lowest": reviewQuery = reviewQuery.order("rating_quality", { ascending: true }); break;
    default: reviewQuery = reviewQuery.order("created_at", { ascending: false });
  }

  const { data: reviews, count } = await reviewQuery.range(offset, offset + limit - 1);

  const courses = ((professor as any).professor_courses || []).map((pc: any) => pc.courses).filter(Boolean);
  let courseStats: any[] = [];
  if (courses.length > 1) {
    for (const course of courses) {
      const { data: cr } = await supabase.from("reviews").select("rating_quality, rating_difficulty")
        .eq("professor_id", professor.id).eq("course_id", course.id).eq("status", "live");
      if (cr && cr.length > 0) {
        courseStats.push({
          course_id: course.id, code: course.code, title_en: course.title_en,
          review_count: cr.length,
          avg_quality: Math.round(cr.reduce((s: number, r: any) => s + Number(r.rating_quality), 0) / cr.length * 100) / 100,
          avg_difficulty: Math.round(cr.reduce((s: number, r: any) => s + Number(r.rating_difficulty), 0) / cr.length * 100) / 100,
        });
      }
    }
    courseStats.sort((a, b) => b.review_count - a.review_count);
  }

  return NextResponse.json({
    professor, reviews: reviews || [], total_reviews: count || 0,
    page, total_pages: Math.ceil((count || 0) / limit), course_stats: courseStats,
  }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } });
}
