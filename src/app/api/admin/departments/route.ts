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

  let query = supabase.from("departments").select("*, universities ( name_en )").order("name_en");
  if (universityId) query = query.eq("university_id", universityId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
  return NextResponse.json({ departments: data }, { headers: NO_STORE_HEADERS });
}

export async function POST(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin || admin.role === "viewer") return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const { name_en, name_ar, university_id } = await req.json();
  if (!name_en || !university_id) return NextResponse.json({ error: "name_en and university_id required" }, { status: 400, headers: NO_STORE_HEADERS });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("departments")
    .insert({ name_en, name_ar, university_id, slug: slugify(name_en) })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
  return NextResponse.json({ department: data }, { status: 201, headers: NO_STORE_HEADERS });
}

export async function PUT(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin || admin.role === "viewer") return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const body = await req.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400, headers: NO_STORE_HEADERS });

  const valid = ["name_en", "name_ar", "university_id"];
  const updates: Record<string, any> = {};
  for (const k of valid) { if (k in body) updates[k] = body[k]; }
  if (updates.name_en) updates.slug = slugify(updates.name_en);

  const supabase = createServiceClient();
  const { data, error } = await supabase.from("departments").update(updates).eq("id", id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
  return NextResponse.json({ department: data }, { headers: NO_STORE_HEADERS });
}
