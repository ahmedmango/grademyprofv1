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
    .from("professors")
    .select("*, departments ( name_en ), universities ( name_en )")
    .order("name_en");

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
    .insert({ name_en, name_ar, university_id, department_id, slug: slugify(name_en) })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
  return NextResponse.json({ professor: data }, { status: 201, headers: NO_STORE_HEADERS });
}

export async function PUT(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin || admin.role === "viewer") return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400, headers: NO_STORE_HEADERS });

  const supabase = createServiceClient();
  const { data, error } = await supabase.from("professors").update(updates).eq("id", id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
  return NextResponse.json({ professor: data }, { headers: NO_STORE_HEADERS });
}

export async function DELETE(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin || admin.role !== "super_admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const { id } = await req.json();
  const supabase = createServiceClient();
  const { error } = await supabase.from("professors").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
  return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
}
