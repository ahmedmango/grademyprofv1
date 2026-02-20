import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const revalidate = 60;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const type = req.nextUrl.searchParams.get("type") || "all";

  if (!q || q.length < 1) {
    return NextResponse.json({ professors: [], courses: [], course_professors: [], universities: [] });
  }

  const sanitized = q.replace(/[^\w\s\-.']/g, "").slice(0, 100);
  if (!sanitized) return NextResponse.json({ professors: [], courses: [], course_professors: [], universities: [] });

  const supabase = createServerClient();
  const results: { professors: any[]; courses: any[]; course_professors: any[]; universities: any[] } = {
    professors: [], courses: [], course_professors: [], universities: [],
  };

  // Always search universities (by name OR acronym)
  {
    const { data } = await supabase
      .from("universities")
      .select("id, name_en, name_ar, slug, short_name")
      .eq("is_active", true)
      .or(`name_en.ilike.%${sanitized}%,short_name.ilike.%${sanitized}%,name_ar.ilike.%${sanitized}%`)
      .order("name_en")
      .limit(5);

    results.universities = (data || []).map((u: any) => ({
      id: u.id, name_en: u.name_en, name_ar: u.name_ar, slug: u.slug, short_name: u.short_name,
    }));
  }

  // Search professors
  if (type === "all" || type === "professors") {
    const { data } = await supabase
      .from("professors")
      .select(`id, name_en, name_ar, slug, photo_url,
        departments ( name_en ), universities ( name_en, slug, short_name ),
        aggregates_professor ( avg_quality, avg_difficulty, review_count, would_take_again_pct, top_tags )`)
      .eq("is_active", true)
      .or(`name_en.ilike.%${sanitized}%,name_ar.ilike.%${sanitized}%`)
      .order("name_en").limit(12);

    results.professors = (data || []).map((p: any) => ({
      id: p.id, name_en: p.name_en, name_ar: p.name_ar, slug: p.slug,
      department: p.departments?.name_en || null,
      university: p.universities?.name_en || null,
      university_short: p.universities?.short_name || null,
      university_slug: p.universities?.slug || null,
      avg_quality: p.aggregates_professor?.avg_quality ?? p.aggregates_professor?.[0]?.avg_quality ?? null,
      review_count: p.aggregates_professor?.review_count ?? p.aggregates_professor?.[0]?.review_count ?? 0,
      would_take_again_pct: p.aggregates_professor?.would_take_again_pct ?? p.aggregates_professor?.[0]?.would_take_again_pct ?? null,
      top_tags: p.aggregates_professor?.top_tags ?? p.aggregates_professor?.[0]?.top_tags ?? [],
    }));
  }

  // Search courses
  if (type === "all" || type === "courses") {
    const { data } = await supabase
      .from("courses")
      .select(`id, code, title_en, slug, universities ( name_en, slug, short_name ), departments ( name_en )`)
      .or(`code.ilike.%${sanitized}%,title_en.ilike.%${sanitized}%`)
      .order("code").limit(12);

    results.courses = (data || []).map((c: any) => ({
      id: c.id, code: c.code, title_en: c.title_en, slug: c.slug,
      university: c.universities?.name_en || null,
      university_short: c.universities?.short_name || null,
      university_slug: c.universities?.slug || null,
      department: c.departments?.name_en || null,
    }));
  }

  // Course -> professor lookup (when query contains numbers)
  if ((type === "all" || type === "courses") && /\d/.test(sanitized)) {
    const { data } = await supabase
      .from("professor_courses")
      .select(`courses!inner ( id, code, title_en, slug ),
        professors!inner ( id, name_en, slug, departments ( name_en ),
          aggregates_professor ( avg_quality, review_count ) )`)
      .ilike("courses.code", `%${sanitized}%`).limit(20);

    if (data) {
      results.course_professors = data.map((row: any) => ({
        course_code: row.courses?.code, course_slug: row.courses?.slug,
        professor_id: row.professors?.id, professor_name: row.professors?.name_en,
        professor_slug: row.professors?.slug, department: row.professors?.departments?.name_en,
        avg_quality: row.professors?.aggregates_professor?.avg_quality ?? null,
        review_count: row.professors?.aggregates_professor?.review_count ?? 0,
      }));
    }
  }

  return NextResponse.json(results, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  });
}
