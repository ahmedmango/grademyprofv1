import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// POST: Create or find a course for a professor during rating flow
export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { course_code, course_title, professor_id } = await req.json();

    if (!course_code || course_code.trim().length < 2) {
      return NextResponse.json({ error: "Course code is required" }, { status: 400 });
    }
    if (!professor_id) {
      return NextResponse.json({ error: "Professor ID is required" }, { status: 400 });
    }

    const code = course_code.trim().toUpperCase();
    const title = (course_title || code).trim();

    // Get professor's university
    const { data: prof } = await supabase
      .from("professors")
      .select("university_id")
      .eq("id", professor_id)
      .single();

    if (!prof) {
      return NextResponse.json({ error: "Professor not found" }, { status: 404 });
    }

    // Check if course already exists with this code at this university
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
      // Create the course
      const slug = code.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const { data: newCourse, error: insertError } = await supabase
        .from("courses")
        .insert({
          code,
          title_en: title,
          slug,
          university_id: prof.university_id,
          is_active: true,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Course creation error:", insertError);
        return NextResponse.json({ error: "Failed to create course" }, { status: 500 });
      }
      courseId = newCourse.id;
    }

    // Link professor to course (ignore if already linked)
    await supabase
      .from("professor_courses")
      .upsert(
        { professor_id, course_id: courseId },
        { onConflict: "professor_id,course_id" }
      )
      .then(() => {});

    return NextResponse.json({ course_id: courseId, code });
  } catch (err) {
    console.error("Course creation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
