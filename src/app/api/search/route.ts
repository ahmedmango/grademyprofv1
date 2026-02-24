import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { NO_STORE_HEADERS } from "@/lib/api-headers";

function sanitizeWord(w: string): string {
  return w.replace(/[^\w\-.']/g, "").slice(0, 50);
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const type = req.nextUrl.searchParams.get("type") || "all";

  const empty = { professors: [], courses: [], course_professors: [], universities: [] };
  if (!q || q.length < 1) {
    return NextResponse.json(empty, { headers: NO_STORE_HEADERS });
  }

  const words = q.split(/\s+/).map(sanitizeWord).filter(Boolean).slice(0, 6);
  if (words.length === 0) return NextResponse.json(empty, { headers: NO_STORE_HEADERS });

  const full = words.join(" ");

  const supabase = createServerClient();
  const results: { professors: any[]; courses: any[]; course_professors: any[]; universities: any[] } = {
    professors: [], courses: [], course_professors: [], universities: [],
  };

  // Universities — every word must appear in name_en OR short_name OR name_ar
  {
    let qb = supabase
      .from("universities")
      .select("id, name_en, name_ar, slug, short_name")
      .eq("is_active", true);

    for (const w of words) {
      qb = qb.or(`name_en.ilike.%${w}%,short_name.ilike.%${w}%,name_ar.ilike.%${w}%`);
    }

    const { data } = await qb.order("name_en").limit(5);
    results.universities = (data || []).map((u: any) => ({
      id: u.id, name_en: u.name_en, name_ar: u.name_ar, slug: u.slug, short_name: u.short_name,
    }));
  }

  // Professors — every word must appear in name_en OR name_ar
  if (type === "all" || type === "professors") {
    let qb = supabase
      .from("professors")
      .select(`id, name_en, name_ar, slug, photo_url,
        departments ( name_en ), universities ( name_en, slug, short_name ),
        aggregates_professor ( avg_quality, avg_difficulty, review_count, would_take_again_pct, top_tags )`)
      .eq("is_active", true);

    for (const w of words) {
      qb = qb.or(`name_en.ilike.%${w}%,name_ar.ilike.%${w}%`);
    }

    const { data } = await qb.order("name_en").limit(12);
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

  // Courses — every word must appear in code OR title_en
  if (type === "all" || type === "courses") {
    let qb = supabase
      .from("courses")
      .select(`id, code, title_en, slug, universities ( name_en, slug, short_name ), departments ( name_en )`);

    for (const w of words) {
      qb = qb.or(`code.ilike.%${w}%,title_en.ilike.%${w}%`);
    }

    const { data } = await qb.order("code").limit(12);
    results.courses = (data || []).map((c: any) => ({
      id: c.id, code: c.code, title_en: c.title_en, slug: c.slug,
      university: c.universities?.name_en || null,
      university_short: c.universities?.short_name || null,
      university_slug: c.universities?.slug || null,
      department: c.departments?.name_en || null,
    }));
  }

  // Course -> professor lookup (match by code or title)
  if (type === "all" || type === "courses") {
    let cpQb = supabase
      .from("professor_courses")
      .select(`courses!inner ( id, code, title_en, slug ),
        professors!inner ( id, name_en, slug, departments ( name_en ),
          aggregates_professor ( avg_quality, review_count ) )`);

    for (const w of words) {
      cpQb = cpQb.or(`code.ilike.%${w}%,title_en.ilike.%${w}%`, { referencedTable: "courses" });
    }

    const { data } = await cpQb.limit(20);

    if (data) {
      const seen = new Set<string>();
      results.course_professors = data
        .map((row: any) => ({
          course_code: row.courses?.code, course_slug: row.courses?.slug,
          professor_id: row.professors?.id, professor_name: row.professors?.name_en,
          professor_slug: row.professors?.slug, department: row.professors?.departments?.name_en,
          avg_quality: row.professors?.aggregates_professor?.avg_quality ?? null,
          review_count: row.professors?.aggregates_professor?.review_count ?? 0,
        }))
        .filter((cp: any) => {
          const key = `${cp.professor_id}-${cp.course_code}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
    }
  }

  return NextResponse.json(results, { headers: NO_STORE_HEADERS });
}
