import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateAdmin } from "@/lib/admin-auth";
import { slugify } from "@/lib/utils";
import { NO_STORE_HEADERS } from "@/lib/api-headers";

const VALID_COLS = new Set(["name_en", "name_ar", "university_id", "department_id", "is_active", "photo_url"]);

function pickCols(obj: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const k of Object.keys(obj)) {
    if (VALID_COLS.has(k)) out[k] = obj[k];
  }
  return out;
}

export async function GET(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const supabase = createServiceClient();
  const universityId = req.nextUrl.searchParams.get("university_id");

  let query = supabase
    .from("professors")
    .select("*, departments ( name_en ), universities ( name_en )")
    .order("created_at", { ascending: false });

  if (universityId) query = query.eq("university_id", universityId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
  return NextResponse.json({ professors: data }, { headers: NO_STORE_HEADERS });
}

export async function POST(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin || admin.role === "viewer") return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const body = await req.json();
  const { name_en, name_ar, university_id, department_id } = body;
  if (!name_en || !university_id) return NextResponse.json({ error: "name_en and university_id required" }, { status: 400, headers: NO_STORE_HEADERS });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("professors")
    .insert({ name_en, name_ar: name_ar || null, university_id, department_id: department_id || null, slug: slugify(name_en), is_active: true })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
  return NextResponse.json({ professor: data }, { status: 201, headers: NO_STORE_HEADERS });
}

export async function PUT(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin || admin.role === "viewer") return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const body = await req.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400, headers: NO_STORE_HEADERS });

  const updates = pickCols(body);
  if (updates.name_en) {
    updates.slug = slugify(updates.name_en);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.from("professors").update(updates).eq("id", id).select("*, departments ( name_en ), universities ( name_en )").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
  return NextResponse.json({ professor: data }, { headers: NO_STORE_HEADERS });
}

export async function DELETE(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin || admin.role !== "super_admin") return NextResponse.json({ error: "Only super admins can delete professors" }, { status: 403, headers: NO_STORE_HEADERS });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400, headers: NO_STORE_HEADERS });

  const supabase = createServiceClient();

  const { count: reviewCount } = await supabase
    .from("reviews")
    .select("*", { count: "exact", head: true })
    .eq("professor_id", id);

  if (reviewCount && reviewCount > 0) {
    const { error } = await supabase.from("professors").update({ is_active: false }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
    return NextResponse.json({ success: true, soft_deleted: true, message: `Deactivated (has ${reviewCount} reviews)` }, { headers: NO_STORE_HEADERS });
  }

  await supabase.from("professor_courses").delete().eq("professor_id", id);
  await supabase.from("aggregates_professor").delete().eq("professor_id", id);

  const { error } = await supabase.from("professors").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
  return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
}
