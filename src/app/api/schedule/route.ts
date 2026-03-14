import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/session";
import { NO_STORE_HEADERS } from "@/lib/api-headers";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("schedules")
    .select("*, course_entries(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Database operation failed" }, { status: 500, headers: NO_STORE_HEADERS });
  return NextResponse.json({ schedules: data }, { headers: NO_STORE_HEADERS });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const body = await req.json();
  const { semester_name, week_start } = body;

  const supabase = createServiceClient();

  // Deactivate other schedules when creating a new active one
  await supabase
    .from("schedules")
    .update({ is_active: false })
    .eq("user_id", user.id);

  const { data, error } = await supabase
    .from("schedules")
    .insert({
      user_id: user.id,
      semester_name: semester_name || "Spring 2026",
      week_start: week_start || "sun",
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Database operation failed" }, { status: 500, headers: NO_STORE_HEADERS });
  return NextResponse.json({ schedule: data }, { status: 201, headers: NO_STORE_HEADERS });
}

export async function PUT(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const body = await req.json();
  const { id, semester_name, is_active, week_start } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400, headers: NO_STORE_HEADERS });

  const supabase = createServiceClient();

  // If activating this schedule, deactivate others first
  if (is_active === true) {
    await supabase
      .from("schedules")
      .update({ is_active: false })
      .eq("user_id", user.id);
  }

  const updates: Record<string, unknown> = {};
  if (semester_name !== undefined) updates.semester_name = semester_name;
  if (is_active !== undefined) updates.is_active = is_active;
  if (week_start !== undefined) updates.week_start = week_start;

  const { data, error } = await supabase
    .from("schedules")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*, course_entries(*)")
    .single();

  if (error) return NextResponse.json({ error: "Database operation failed" }, { status: 500, headers: NO_STORE_HEADERS });
  return NextResponse.json({ schedule: data }, { headers: NO_STORE_HEADERS });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400, headers: NO_STORE_HEADERS });

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("schedules")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: "Database operation failed" }, { status: 500, headers: NO_STORE_HEADERS });
  return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
}
