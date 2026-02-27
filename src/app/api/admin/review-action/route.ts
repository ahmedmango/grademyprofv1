import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateAdmin } from "@/lib/admin-auth";
import { NO_STORE_HEADERS } from "@/lib/api-headers";
import { sendReviewLive, sendReviewRejected } from "@/lib/email";

const STATUS_MAP: Record<string, string> = { approve: "live", reject: "removed", shadow: "shadow", flag: "flagged" };
const VALID_ACTIONS = ["approve", "reject", "shadow", "flag", "delete"];

export async function POST(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const { review_id, action } = await req.json();
  if (!review_id || !action || !VALID_ACTIONS.includes(action))
    return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: NO_STORE_HEADERS });

  const supabase = createServiceClient();
  const newStatus = STATUS_MAP[action];

  const { data: review } = await supabase
    .from("reviews")
    .select("id, professor_id, status, user_id, courses ( code ), professors ( name_en )")
    .eq("id", review_id)
    .single();
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404, headers: NO_STORE_HEADERS });

  if (action === "delete") {
    if (admin.role !== "super_admin" && admin.role !== "moderator")
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403, headers: NO_STORE_HEADERS });
    const { error } = await supabase.from("reviews").delete().eq("id", review_id);
    if (error) return NextResponse.json({ error: "Failed to delete" }, { status: 500, headers: NO_STORE_HEADERS });
    if (review.status === "live") {
      await supabase.rpc("refresh_professor_aggregates", { p_professor_id: review.professor_id });
    }
    return NextResponse.json({ success: true, review_id, action: "deleted" }, { headers: NO_STORE_HEADERS });
  }

  const { error } = await supabase.from("reviews").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", review_id);
  if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500, headers: NO_STORE_HEADERS });

  if (newStatus === "live" || review.status === "live") {
    await supabase.rpc("refresh_professor_aggregates", { p_professor_id: review.professor_id });
  }

  // Fire-and-forget email notification for approve/reject
  if (review.user_id && (newStatus === "live" || newStatus === "removed")) {
    (async () => {
      try {
        const { data: user } = await supabase
          .from("user_accounts").select("email, username").eq("id", review.user_id).single();
        if (user?.email) {
          const profName = (review as any).professors?.name_en || "the professor";
          const courseCode = (review as any).courses?.code || "";
          if (newStatus === "live") {
            await sendReviewLive(user.email, user.username, profName, courseCode);
          } else {
            await sendReviewRejected(user.email, user.username, profName);
          }
        }
      } catch (err) { console.error("[email] review-action notify failed:", err); }
    })();
  }

  return NextResponse.json({ success: true, review_id, old_status: review.status, new_status: newStatus }, { headers: NO_STORE_HEADERS });
}

export async function PATCH(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const { review_id, rating_quality, rating_difficulty, would_take_again, tags, comment, course_code, course_title } = await req.json();
  if (!review_id) return NextResponse.json({ error: "review_id required" }, { status: 400, headers: NO_STORE_HEADERS });

  const supabase = createServiceClient();
  const { data: review } = await supabase.from("reviews").select("id, professor_id, course_id, status").eq("id", review_id).single();
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404, headers: NO_STORE_HEADERS });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (rating_quality !== undefined) updates.rating_quality = Math.min(5, Math.max(1, Number(rating_quality)));
  if (rating_difficulty !== undefined) updates.rating_difficulty = Math.min(5, Math.max(1, Number(rating_difficulty)));
  if (would_take_again !== undefined) updates.would_take_again = would_take_again;
  if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : [];
  if (comment !== undefined) updates.comment = String(comment).trim();

  const { error } = await supabase.from("reviews").update(updates).eq("id", review_id);
  if (error) return NextResponse.json({ error: "Failed to update review" }, { status: 500, headers: NO_STORE_HEADERS });

  if (review.course_id && (course_code !== undefined || course_title !== undefined)) {
    const courseUpdates: Record<string, string> = {};
    if (course_code !== undefined) courseUpdates.code = String(course_code).trim().toUpperCase();
    if (course_title !== undefined) courseUpdates.title_en = String(course_title).trim();
    await supabase.from("courses").update(courseUpdates).eq("id", review.course_id);
  }

  if (review.status === "live") {
    await supabase.rpc("refresh_professor_aggregates", { p_professor_id: review.professor_id });
  }

  return NextResponse.json({ success: true, review_id }, { headers: NO_STORE_HEADERS });
}

export async function PUT(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  if (admin.role !== "super_admin" && admin.role !== "moderator")
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403, headers: NO_STORE_HEADERS });

  const { review_ids, action } = await req.json();
  if (!Array.isArray(review_ids) || review_ids.length === 0 || !VALID_ACTIONS.includes(action))
    return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: NO_STORE_HEADERS });
  if (review_ids.length > 50)
    return NextResponse.json({ error: "Max 50 per bulk action" }, { status: 400, headers: NO_STORE_HEADERS });

  const supabase = createServiceClient();
  const newStatus = STATUS_MAP[action];

  const { data: reviews } = await supabase.from("reviews").select("id, professor_id, status").in("id", review_ids);

  if (action === "delete") {
    const { error } = await supabase.from("reviews").delete().in("id", review_ids);
    if (error) return NextResponse.json({ error: "Bulk delete failed" }, { status: 500, headers: NO_STORE_HEADERS });
  } else {
    const { error } = await supabase.from("reviews").update({ status: newStatus, updated_at: new Date().toISOString() }).in("id", review_ids);
    if (error) return NextResponse.json({ error: "Bulk update failed" }, { status: 500, headers: NO_STORE_HEADERS });
  }

  const professorIds = [...new Set((reviews || []).map((r) => r.professor_id))];
  if (professorIds.length > 0) {
    try { await supabase.rpc("refresh_professor_aggregates_batch", { p_professor_ids: professorIds }); }
    catch { await Promise.all(professorIds.map((pid) => supabase.rpc("refresh_professor_aggregates", { p_professor_id: pid }))); }
  }
  if (review_ids.length >= 5) { try { await supabase.rpc("refresh_trending"); } catch {} }

  return NextResponse.json({ success: true, updated_count: review_ids.length, affected_professors: professorIds.length }, { headers: NO_STORE_HEADERS });
}
