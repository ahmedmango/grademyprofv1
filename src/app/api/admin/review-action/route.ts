import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateAdmin } from "@/lib/admin-auth";

const STATUS_MAP: Record<string, string> = { approve: "live", reject: "removed", shadow: "shadow", flag: "flagged" };
const VALID_ACTIONS = ["approve", "reject", "shadow", "flag"];

export async function POST(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { review_id, action } = await req.json();
  if (!review_id || !action || !VALID_ACTIONS.includes(action))
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const supabase = createServiceClient();
  const newStatus = STATUS_MAP[action];

  const { data: review } = await supabase.from("reviews").select("id, professor_id, status").eq("id", review_id).single();
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  const { error } = await supabase.from("reviews").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", review_id);
  if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 });

  if (newStatus === "live" || review.status === "live") {
    await supabase.rpc("refresh_professor_aggregates", { p_professor_id: review.professor_id });
  }

  return NextResponse.json({ success: true, review_id, old_status: review.status, new_status: newStatus });
}

export async function PUT(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "super_admin" && admin.role !== "moderator")
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { review_ids, action } = await req.json();
  if (!Array.isArray(review_ids) || review_ids.length === 0 || !VALID_ACTIONS.includes(action))
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (review_ids.length > 50)
    return NextResponse.json({ error: "Max 50 per bulk action" }, { status: 400 });

  const supabase = createServiceClient();
  const newStatus = STATUS_MAP[action];

  const { data: reviews } = await supabase.from("reviews").select("id, professor_id, status").in("id", review_ids);
  const { error } = await supabase.from("reviews").update({ status: newStatus, updated_at: new Date().toISOString() }).in("id", review_ids);
  if (error) return NextResponse.json({ error: "Bulk update failed" }, { status: 500 });

  const professorIds = [...new Set((reviews || []).map((r) => r.professor_id))];
  if (professorIds.length > 0) {
    try { await supabase.rpc("refresh_professor_aggregates_batch", { p_professor_ids: professorIds }); }
    catch { await Promise.all(professorIds.map((pid) => supabase.rpc("refresh_professor_aggregates", { p_professor_id: pid }))); }
  }
  if (review_ids.length >= 5) { try { await supabase.rpc("refresh_trending"); } catch {} }

  return NextResponse.json({ success: true, updated_count: review_ids.length, affected_professors: professorIds.length });
}
