import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateAdmin } from "@/lib/admin-auth";
import { slugify } from "@/lib/utils";
import { NO_STORE_HEADERS } from "@/lib/api-headers";

export async function GET(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const supabase = createServiceClient();
  const universityId = req.nextUrl.searchParams.get("university_id");

  let query = supabase
    .from("courses")
    .select("*, departments ( name_en ), universities ( name_en )")
    .order("code");

  if (universityId) query = query.eq("university_id", universityId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
  return NextResponse.json({ courses: data }, { headers: NO_STORE_HEADERS });
}

export async function POST(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin || admin.role === "viewer") return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const body = await req.json();
  const { code, title_en, title_ar, university_id, department_id } = body;
  if (!code || !title_en || !university_id) {
    return NextResponse.json({ error: "code, title_en, university_id required" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("courses")
    .insert({ code, title_en, title_ar, university_id, department_id, slug: slugify(`${code}-${title_en}`) })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
  return NextResponse.json({ course: data }, { status: 201, headers: NO_STORE_HEADERS });
}

export async function PUT(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin || admin.role === "viewer") return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400, headers: NO_STORE_HEADERS });

  const supabase = createServiceClient();
  const { data, error } = await supabase.from("courses").update(updates).eq("id", id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
  return NextResponse.json({ course: data }, { headers: NO_STORE_HEADERS });
}

export async function DELETE(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin || admin.role !== "super_admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const { id } = await req.json();
  const supabase = createServiceClient();
  const { error } = await supabase.from("courses").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
  return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
}
