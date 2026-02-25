import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { NO_STORE_HEADERS } from "@/lib/api-headers";

export async function GET(req: NextRequest) {
  const professorId = req.nextUrl.searchParams.get("professorId");
  if (!professorId) {
    return NextResponse.json({ courses: [] }, { headers: NO_STORE_HEADERS });
  }

  const supabase = createServerClient();

  const { data } = await supabase
    .from("professor_courses")
    .select("courses ( id, code, title_en )")
    .eq("professor_id", professorId);

  const courses = (data || [])
    .map((row: any) => row.courses)
    .filter(Boolean)
    .sort((a: any, b: any) => (a.code || "").localeCompare(b.code || ""));

  return NextResponse.json({ courses }, { headers: NO_STORE_HEADERS });
}
