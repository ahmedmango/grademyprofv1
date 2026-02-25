import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateAdmin } from "@/lib/admin-auth";
import { slugify } from "@/lib/utils";
import { NO_STORE_HEADERS } from "@/lib/api-headers";

export async function GET(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("universities").select("*").order("name_en");

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
  return NextResponse.json({ universities: data }, { headers: NO_STORE_HEADERS });
}

export async function POST(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin || admin.role === "viewer") return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const body = await req.json();
  const { name_en, name_ar, country } = body;
  if (!name_en) return NextResponse.json({ error: "name_en required" }, { status: 400, headers: NO_STORE_HEADERS });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("universities")
    .insert({ name_en, name_ar, country: country || "BH", slug: slugify(name_en) })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
  return NextResponse.json({ university: data }, { status: 201, headers: NO_STORE_HEADERS });
}

export async function PUT(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin || admin.role === "viewer") return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const body = await req.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400, headers: NO_STORE_HEADERS });

  const valid = ["name_en", "name_ar", "country", "short_name", "is_active"];
  const updates: Record<string, any> = {};
  for (const k of valid) { if (k in body) updates[k] = body[k]; }
  if (updates.name_en) updates.slug = slugify(updates.name_en);

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("universities").update(updates).eq("id", id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
  return NextResponse.json({ university: data }, { headers: NO_STORE_HEADERS });
}

export async function DELETE(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin || admin.role !== "super_admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400, headers: NO_STORE_HEADERS });

  const supabase = createServiceClient();
  const { error } = await supabase.from("universities").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
  return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
}
