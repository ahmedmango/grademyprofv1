import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 1) {
    return NextResponse.json({ professors: [], courses: [] });
  }

  const supabase = createServerClient();

  // Search professors
  const { data: professors } = await supabase
    .from("professors")
    .select(`
      id, name_en, name_ar, slug, photo_url,
      departments ( name_en ),
      universities ( name_en, slug ),
      aggregates_professor ( avg_quality, review_count )
    `)
    .or(`name_en.ilike.%${q}%,name_ar.ilike.%${q}%`)
    .eq("is_active", true)
    .limit(10);

  // Search courses
  const { data: courses } = await supabase
    .from("courses")
    .select(`
      id, code, title_en, slug,
      universities ( name_en, slug )
    `)
    .or(`code.ilike.%${q}%,title_en.ilike.%${q}%`)
    .limit(10);

  return NextResponse.json({
    professors: professors || [],
    courses: courses || [],
  });
}
