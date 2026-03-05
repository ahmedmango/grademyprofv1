import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { NO_STORE_HEADERS } from "@/lib/api-headers";
import logger from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { course_code, course_title, professor_id } = await req.json();

    if (!course_code || course_code.trim().length < 2) {
      return NextResponse.json({ error: "Course code is required" }, { status: 400, headers: NO_STORE_HEADERS });
    }
    if (!professor_id) {
      return NextResponse.json({ error: "Professor ID is required" }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const code = course_code.trim().toUpperCase();
    const title = (course_title || code).trim();

    const { data: prof, error: profError } = await supabase
      .from("professors")
      .select("university_id")
      .eq("id", professor_id)
      .single();

    if (profError || !prof) {
      logger.error("Professor lookup failed:", profError);
      return NextResponse.json({ error: "Professor not found" }, { status: 404, headers: NO_STORE_HEADERS });
    }

    const { data: existing } = await supabase
      .from("courses")
      .select("id")
      .eq("code", code)
      .eq("university_id", prof.university_id)
      .maybeSingle();

    let courseId: string;

    if (existing) {
      courseId = existing.id;
    } else {
      const baseSlug = code.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      let insertOk = false;

      for (let attempt = 0; attempt < 3; attempt++) {
        const suffix = Math.random().toString(36).slice(2, 7);
        const slug = attempt === 0 ? baseSlug : `${baseSlug}-${suffix}`;
        const { data: newCourse, error: insertError } = await supabase
          .from("courses")
          .insert({ code, title_en: title, slug, university_id: prof.university_id })
          .select("id")
          .single();

        if (!insertError && newCourse) {
          courseId = newCourse.id;
          insertOk = true;
          break;
        }

        if (insertError?.code === "23505" && insertError.message?.includes("slug")) {
          continue;
        }

        logger.error("Course creation error:", insertError);
        return NextResponse.json(
          { error: `Failed to create course: ${insertError?.message || "unknown error"}` },
          { status: 500, headers: NO_STORE_HEADERS },
        );
      }

      if (!insertOk) {
        return NextResponse.json(
          { error: "Failed to create course after retries (slug conflict)" },
          { status: 500, headers: NO_STORE_HEADERS },
        );
      }
    }

    await supabase
      .from("professor_courses")
      .upsert({ professor_id, course_id: courseId! }, { onConflict: "professor_id,course_id" });

    return NextResponse.json({ course_id: courseId!, code }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    logger.error("Course creation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
