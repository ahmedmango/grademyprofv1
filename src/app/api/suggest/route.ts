import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, name_en, name_ar, university_id, extra } = body;

    if (!type || !name_en || name_en.trim().length < 2) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const slug = slugify(name_en);

    switch (type) {
      case "university": {
        const { data: existing } = await supabase.from("universities").select("id").eq("slug", slug).maybeSingle();
        if (existing) return NextResponse.json({ error: "This university may already exist" }, { status: 409 });

        const { error } = await supabase.from("universities").insert({
          name_en: name_en.trim(),
          name_ar: name_ar?.trim() || null,
          country_code: "BH",
          slug,
          is_active: false,
        });
        if (error) return NextResponse.json({ error: "Failed to save" }, { status: 500 });
        break;
      }

      case "professor": {
        if (!university_id) return NextResponse.json({ error: "University is required" }, { status: 400 });
        const { data: existing } = await supabase.from("professors").select("id").eq("slug", slug).maybeSingle();
        if (existing) return NextResponse.json({ error: "This professor may already exist" }, { status: 409 });

        const { error } = await supabase.from("professors").insert({
          name_en: name_en.trim(),
          name_ar: name_ar?.trim() || null,
          university_id,
          slug,
          is_active: true,
        });
        if (error) return NextResponse.json({ error: "Failed to save" }, { status: 500 });
        break;
      }

      case "course": {
        if (!university_id || !extra) return NextResponse.json({ error: "University and course code required" }, { status: 400 });
        const courseSlug = slugify(`${extra}-${name_en}`);
        const { error } = await supabase.from("courses").insert({
          code: extra.trim().toUpperCase(),
          title_en: name_en.trim(),
          title_ar: name_ar?.trim() || null,
          university_id,
          slug: courseSlug,
        });
        if (error) return NextResponse.json({ error: "Failed to save" }, { status: 500 });
        break;
      }

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
