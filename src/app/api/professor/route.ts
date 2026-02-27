import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { NO_STORE_HEADERS } from "@/lib/api-headers";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400, headers: NO_STORE_HEADERS });

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

  if (error || !professor) return NextResponse.json({ error: "Professor not found" }, { status: 404, headers: NO_STORE_HEADERS });

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
    // Single query instead of one per course
    const { data: allCourseReviews } = await supabase
      .from("reviews")
      .select("course_id, rating_quality, rating_difficulty")
      .eq("professor_id", professor.id)
      .eq("status", "live");
    const statsMap: Record<string, { q: number[]; d: number[] }> = {};
    for (const r of allCourseReviews || []) {
      if (!statsMap[r.course_id]) statsMap[r.course_id] = { q: [], d: [] };
      statsMap[r.course_id].q.push(Number(r.rating_quality));
      statsMap[r.course_id].d.push(Number(r.rating_difficulty));
    }
    courseStats = courses
      .map((course: any) => {
        const s = statsMap[course.id];
        if (!s || s.q.length === 0) return null;
        const avg = (arr: number[]) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 100) / 100;
        return { course_id: course.id, code: course.code, title_en: course.title_en, review_count: s.q.length, avg_quality: avg(s.q), avg_difficulty: avg(s.d) };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.review_count - a.review_count);
  }

  return NextResponse.json({
    professor, reviews: reviews || [], total_reviews: count || 0,
    page, total_pages: Math.ceil((count || 0) / limit), course_stats: courseStats,
  }, { headers: NO_STORE_HEADERS });
}
