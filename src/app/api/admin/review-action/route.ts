import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateAdmin } from "@/lib/admin-auth";
import { NO_STORE_HEADERS } from "@/lib/api-headers";
import { sendReviewLive, sendReviewRejected, sendReviewMilestone } from "@/lib/email";
import logger from "@/lib/logger";
import { VALID_TAGS, RATE_LIMITS } from "@/lib/constants";

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
    .select("id, professor_id, status, user_id, courses ( code ), professors ( name_en, slug )")
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

  // Email notification for approve/reject — awaited so it completes before the serverless function exits
  logger.debug("[review-action]", `action=${action} newStatus=${newStatus}`);
  if (review.user_id && (newStatus === "live" || newStatus === "removed")) {
    try {
      const { data: user } = await supabase
        .from("user_accounts").select("email, username").eq("id", review.user_id).single();
      logger.debug("[review-action] user lookup →", user ? user.username : "not found");
      if (user?.email) {
        const profName = (review as any).professors?.name_en || "the professor";
        const profSlug = (review as any).professors?.slug || "";
        const courseCode = (review as any).courses?.code || "";
        if (newStatus === "live") {
          await sendReviewLive(user.email, user.username, profName, courseCode, profSlug);
        } else {
          await sendReviewRejected(user.email, user.username, profName);
        }
      }
    } catch (err) { logger.error("[email] review-action notify failed:", err); }
  }

  return NextResponse.json({ success: true, review_id, old_status: review.status, new_status: newStatus }, { headers: NO_STORE_HEADERS });
}

export async function PATCH(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const { review_id, rating_quality, rating_difficulty, would_take_again, tags, comment, course_code, course_title, upvote_boost } = await req.json();
  if (!review_id) return NextResponse.json({ error: "review_id required" }, { status: 400, headers: NO_STORE_HEADERS });

  const supabase = createServiceClient();
  const { data: review } = await supabase.from("reviews").select("id, professor_id, course_id, status, upvote_boost, user_id, courses ( code ), professors ( name_en, slug )").eq("id", review_id).single();
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404, headers: NO_STORE_HEADERS });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (rating_quality !== undefined) updates.rating_quality = Math.min(5, Math.max(1, Number(rating_quality)));
  if (rating_difficulty !== undefined) updates.rating_difficulty = Math.min(5, Math.max(1, Number(rating_difficulty)));
  if (would_take_again !== undefined) updates.would_take_again = would_take_again;
  if (tags !== undefined) updates.tags = (Array.isArray(tags) ? tags : []).filter((t: string) => VALID_TAGS.includes(t as any)).slice(0, RATE_LIMITS.MAX_TAGS);
  if (comment !== undefined) updates.comment = String(comment).trim();
  if (upvote_boost !== undefined) updates.upvote_boost = Math.max(0, Math.round(Number(upvote_boost)));

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

  // Milestone email when admin boost pushes total upvotes to >= 5
  if (upvote_boost !== undefined && review.user_id) {
    const oldBoost = (review as any).upvote_boost || 0;
    const newBoost = updates.upvote_boost as number;
    if (oldBoost !== newBoost) {
      try {
        const { count: realVotes } = await supabase
          .from("review_votes")
          .select("*", { count: "exact", head: true })
          .eq("review_id", review_id)
          .eq("vote", "up");
        const oldTotal = (realVotes || 0) + oldBoost;
        const newTotal = (realVotes || 0) + newBoost;
        if (oldTotal < 5 && newTotal >= 5) {
          const { data: author } = await supabase
            .from("user_accounts").select("email, username").eq("id", review.user_id).single();
          if (author?.email) {
            const profName = (review as any).professors?.name_en || "the professor";
            const profSlug = (review as any).professors?.slug || "";
            const courseCode = (review as any).courses?.code || "";
            await sendReviewMilestone(author.email, author.username, profName, courseCode, profSlug);
          }
        }
      } catch (err) {
        logger.error("[review-action] milestone email failed:", err);
      }
    }
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

  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, professor_id, status, user_id, courses ( code ), professors ( name_en, slug )")
    .in("id", review_ids);

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

  // Email notifications for bulk approve/reject
  if (newStatus === "live" || newStatus === "removed") {
    const reviewsWithUser = (reviews || []).filter((r) => r.user_id);
    if (reviewsWithUser.length > 0) {
      const userIds = [...new Set(reviewsWithUser.map((r) => r.user_id))];
      const { data: users } = await supabase
        .from("user_accounts")
        .select("id, email, username")
        .in("id", userIds);
      const userMap = new Map((users || []).map((u) => [u.id, u]));

      await Promise.allSettled(
        reviewsWithUser.map(async (r) => {
          const user = userMap.get(r.user_id);
          if (!user?.email) return;
          try {
            const profName = (r as any).professors?.name_en || "the professor";
            const profSlug = (r as any).professors?.slug || "";
            const courseCode = (r as any).courses?.code || "";
            if (newStatus === "live") {
              await sendReviewLive(user.email, user.username, profName, courseCode, profSlug);
            } else {
              await sendReviewRejected(user.email, user.username, profName);
            }
          } catch (err) {
            logger.error(`[email] bulk notify failed for review ${r.id}:`, err);
          }
        }),
      );
    }
  }

  return NextResponse.json({ success: true, updated_count: review_ids.length, affected_professors: professorIds.length }, { headers: NO_STORE_HEADERS });
}
