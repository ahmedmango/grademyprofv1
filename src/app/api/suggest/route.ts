import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await req.json();
    const { type, name_en, name_ar, university_id, extra } = body;

    if (!type || !name_en || name_en.trim().length < 2) {
      return NextResponse.json({ error: "Name is required (min 2 characters)" }, { status: 400 });
    }

    if (type === "professor") {
      if (!university_id) {
        return NextResponse.json({ error: "University is required" }, { status: 400 });
      }

      const slug = slugify(name_en.trim());

      // Check for duplicate
      const { data: existing } = await supabase
        .from("professors")
        .select("id")
        .eq("slug", slug)
        .eq("university_id", university_id)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: "This professor already exists at this university" }, { status: 409 });
      }

      const { data: prof, error } = await supabase
        .from("professors")
        .insert({
          name_en: name_en.trim(),
          name_ar: name_ar?.trim() || null,
          slug,
          university_id,
          is_active: true,
        })
        .select("id, slug")
        .single();

      if (error) {
        console.error("Professor creation error:", error);
        return NextResponse.json({ error: "Failed to add professor" }, { status: 500 });
      }

      // Get university slug for revalidation
      const { data: uni } = await supabase
        .from("universities")
        .select("slug")
        .eq("id", university_id)
        .single();

      // Revalidate the university page and home page so new professor appears immediately
      try {
        if (uni) revalidatePath(`/u/${uni.slug}`, "page");
        revalidatePath("/", "page");
      } catch {}

      return NextResponse.json({
        success: true,
        professor: prof,
        message: "Professor added successfully",
      }, { status: 201 });

    } else if (type === "course") {
      const code = (extra || "").trim().toUpperCase();
      const title = name_en.trim();
      const slug = slugify(code || title);

      const { data: course, error } = await supabase
        .from("courses")
        .insert({
          code: code || null,
          title_en: title,
          slug,
          university_id: university_id || null,
          is_active: true,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Course creation error:", error);
        return NextResponse.json({ error: "Failed to add course" }, { status: 500 });
      }

      return NextResponse.json({ success: true, course }, { status: 201 });

    } else if (type === "university") {
      // Universities go to suggestions for admin review
      const { error } = await supabase
        .from("suggestions")
        .insert({
          type: "university",
          name_en: name_en.trim(),
          name_ar: name_ar?.trim() || null,
          status: "pending",
        });

      if (error) {
        console.error("Suggestion error:", error);
        return NextResponse.json({ error: "Failed to submit suggestion" }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: "University suggested" }, { status: 201 });

    } else if (type === "link_professor_course") {
      const { professor_id, course_id } = body;
      if (!professor_id || !course_id) {
        return NextResponse.json({ error: "professor_id and course_id required" }, { status: 400 });
      }

      await supabase
        .from("professor_courses")
        .upsert(
          { professor_id, course_id },
          { onConflict: "professor_id,course_id" }
        );

      return NextResponse.json({ success: true });

    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (err) {
    console.error("Suggest error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
