import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/session";
import { NO_STORE_HEADERS } from "@/lib/api-headers";

// Verify the schedule belongs to the user
async function verifyScheduleOwnership(supabase: ReturnType<typeof createServiceClient>, scheduleId: string, userId: string) {
  const { data } = await supabase
    .from("schedules")
    .select("id")
    .eq("id", scheduleId)
    .eq("user_id", userId)
    .single();
  return !!data;
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const body = await req.json();
  const { schedule_id, course_name, section, professor_name, professor_id, days, start_time, end_time, location, color, credit_hours, notes } = body;

  if (!schedule_id || !course_name) {
    return NextResponse.json({ error: "schedule_id and course_name required" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const supabase = createServiceClient();

  if (!(await verifyScheduleOwnership(supabase, schedule_id, user.id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403, headers: NO_STORE_HEADERS });
  }

  // Limit entries per schedule
  const { count } = await supabase
    .from("course_entries")
    .select("*", { count: "exact", head: true })
    .eq("schedule_id", schedule_id);

  if (count && count >= 15) {
    return NextResponse.json({ error: "Maximum 15 courses per schedule" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const { data, error } = await supabase
    .from("course_entries")
    .insert({
      schedule_id,
      course_name: course_name.trim(),
      section: section?.trim() || null,
      professor_name: professor_name?.trim() || "",
      professor_id: professor_id || null,
      days: days || [],
      start_time: start_time || "09:00",
      end_time: end_time || "10:00",
      location: location?.trim() || null,
      color: color || "#7C3AED",
      credit_hours: Math.min(Math.max(credit_hours || 3, 0), 12),
      notes: notes?.trim() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Database operation failed" }, { status: 500, headers: NO_STORE_HEADERS });
  return NextResponse.json({ entry: data }, { status: 201, headers: NO_STORE_HEADERS });
}

export async function PUT(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const body = await req.json();
  const { id, schedule_id } = body;
  if (!id || !schedule_id) return NextResponse.json({ error: "id and schedule_id required" }, { status: 400, headers: NO_STORE_HEADERS });

  const supabase = createServiceClient();

  if (!(await verifyScheduleOwnership(supabase, schedule_id, user.id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403, headers: NO_STORE_HEADERS });
  }

  const valid = ["course_name", "section", "professor_name", "professor_id", "days", "start_time", "end_time", "location", "color", "credit_hours", "notes"];
  const updates: Record<string, unknown> = {};
  for (const k of valid) {
    if (k in body) updates[k] = body[k];
  }

  // Trim strings
  if (typeof updates.course_name === "string") updates.course_name = (updates.course_name as string).trim();
  if (typeof updates.professor_name === "string") updates.professor_name = (updates.professor_name as string).trim();
  if (typeof updates.section === "string") updates.section = (updates.section as string).trim() || null;
  if (typeof updates.location === "string") updates.location = (updates.location as string).trim() || null;
  if (typeof updates.notes === "string") updates.notes = (updates.notes as string).trim() || null;
  if (typeof updates.credit_hours === "number") updates.credit_hours = Math.min(Math.max(updates.credit_hours as number, 0), 12);

  const { data, error } = await supabase
    .from("course_entries")
    .update(updates)
    .eq("id", id)
    .eq("schedule_id", schedule_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Database operation failed" }, { status: 500, headers: NO_STORE_HEADERS });
  return NextResponse.json({ entry: data }, { headers: NO_STORE_HEADERS });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const { id, schedule_id } = await req.json();
  if (!id || !schedule_id) return NextResponse.json({ error: "id and schedule_id required" }, { status: 400, headers: NO_STORE_HEADERS });

  const supabase = createServiceClient();

  if (!(await verifyScheduleOwnership(supabase, schedule_id, user.id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403, headers: NO_STORE_HEADERS });
  }

  const { error } = await supabase
    .from("course_entries")
    .delete()
    .eq("id", id)
    .eq("schedule_id", schedule_id);

  if (error) return NextResponse.json({ error: "Database operation failed" }, { status: 500, headers: NO_STORE_HEADERS });
  return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
}
