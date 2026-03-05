import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { scanContent } from "@/lib/moderation";
import { VALID_TAGS, RATE_LIMITS } from "@/lib/constants";
import { getCurrentSemester } from "@/lib/utils";
import { NO_STORE_HEADERS } from "@/lib/api-headers";
import { sendReviewLive, sendAdminNewReview } from "@/lib/email";
import logger from "@/lib/logger";
import { getSessionUser } from "@/lib/session";
import { sha256Short } from "@/lib/hash";

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await req.json();
    const anonUserHash = req.headers.get("x-anon-user-hash") || "";
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const [ipHash, uaHash] = await Promise.all([
      sha256Short(clientIp),
      sha256Short(req.headers.get("user-agent") || ""),
    ]);

    const { professor_id, course_id, rating_quality, rating_difficulty,
      would_take_again, attendance_mandatory, uses_textbook, grade_received,
      tags, comment } = body;

    const sessionUser = await getSessionUser(req);
    const user_id = sessionUser?.id || null;

    if (!professor_id || !course_id || !rating_quality || !rating_difficulty)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: NO_STORE_HEADERS });

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(professor_id))
      return NextResponse.json({ error: "Invalid professor_id" }, { status: 400, headers: NO_STORE_HEADERS });
    if (!UUID_RE.test(course_id))
      return NextResponse.json({ error: "Invalid course_id" }, { status: 400, headers: NO_STORE_HEADERS });

    if (!anonUserHash || anonUserHash.length < 8)
      return NextResponse.json({ error: "Invalid identity token" }, { status: 400, headers: NO_STORE_HEADERS });

    let hasVerifiedAccount = false;
    if (user_id) {
      const { data: userAccount } = await supabase
        .from("user_accounts")
        .select("id, is_banned")
        .eq("id", user_id)
        .single();
      if (userAccount) {
        if (userAccount.is_banned) return NextResponse.json({ error: "Your account has been suspended" }, { status: 403, headers: NO_STORE_HEADERS });
        hasVerifiedAccount = true;
      }
    }

    const validRating = (v: number) => typeof v === "number" && v >= 0.5 && v <= 5.0 && (v * 10) % 5 === 0;
    if (!validRating(rating_quality) || !validRating(rating_difficulty))
      return NextResponse.json({ error: "Ratings must be 0.5–5.0 in 0.5 increments" }, { status: 400, headers: NO_STORE_HEADERS });

    const validTags = (tags || []).filter((t: string) => VALID_TAGS.includes(t as any)).slice(0, RATE_LIMITS.MAX_TAGS);
    const cleanComment = (comment || "").trim().slice(0, RATE_LIMITS.MAX_COMMENT_LENGTH).replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[REDACTED]").replace(/\+?973\s?\d{4}\s?\d{4}/g, "[REDACTED]");

    const semester = getCurrentSemester();
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

    const [profResult, courseResult, userDayResult, ipHourResult, duplicateResult] = await Promise.all([
      supabase.from("professors").select("id, university_id, slug, name_en").eq("id", professor_id).eq("is_active", true).single(),
      supabase.from("courses").select("id").eq("id", course_id).single(),
      supabase.from("rate_limits").select("*", { count: "exact", head: true }).eq("anon_user_hash", anonUserHash).gte("created_at", oneDayAgo),
      supabase.from("rate_limits").select("*", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", oneHourAgo),
      supabase.from("reviews").select("id").eq("anon_user_hash", anonUserHash).eq("professor_id", professor_id)
        .eq("course_id", course_id).eq("semester_window", semester).neq("status", "removed").maybeSingle(),
    ]);

    if (!profResult.data) return NextResponse.json({ error: "Professor not found" }, { status: 404, headers: NO_STORE_HEADERS });
    if (!courseResult.data) return NextResponse.json({ error: "Course not found" }, { status: 404, headers: NO_STORE_HEADERS });
    if ((userDayResult.count || 0) >= RATE_LIMITS.MAX_REVIEWS_PER_DAY)
      return NextResponse.json({ error: "Daily review limit reached. Try again tomorrow." }, { status: 429, headers: NO_STORE_HEADERS });
    if ((ipHourResult.count || 0) >= RATE_LIMITS.MAX_REVIEWS_PER_IP_HOUR)
      return NextResponse.json({ error: "Too many submissions from this network." }, { status: 429, headers: NO_STORE_HEADERS });
    if (duplicateResult.data)
      return NextResponse.json({ error: "You already reviewed this professor for this course this semester." }, { status: 409, headers: NO_STORE_HEADERS });

    const scan = scanContent(cleanComment);

    const fiveMinAgo = new Date(Date.now() - 300000).toISOString();
    const { count: recentSameProf } = await supabase.from("reviews").select("*", { count: "exact", head: true })
      .eq("professor_id", professor_id).gte("created_at", fiveMinAgo);
    if ((recentSameProf || 0) >= 5) { scan.risk_flags.brigading_suspect = true; scan.suggested_status = "flagged"; }

    let status: string;
    if (scan.suggested_status === "removed") {
      status = "removed";
    } else if (scan.suggested_status === "flagged") {
      status = "flagged";
    } else {
      const isClean = scan.toxicity_score === 0 && Object.keys(scan.risk_flags).length === 0;
      const hasMeaningfulComment = cleanComment.length >= 30;
      const isExtreme = (rating_quality === 5.0 && rating_difficulty <= 1.0) || (rating_quality <= 1.0 && rating_difficulty >= 5.0);
      const extremeWithShortComment = isExtreme && cleanComment.length < 80;
      if (isClean && hasMeaningfulComment && !extremeWithShortComment && hasVerifiedAccount) {
        status = "live";
      } else {
        status = "pending";
      }
    }

    const { data: review, error: insertError } = await supabase.from("reviews").insert({
      professor_id, course_id, university_id: profResult.data.university_id, anon_user_hash: anonUserHash,
      rating_quality, rating_difficulty, would_take_again: would_take_again ?? null,
      attendance_mandatory: attendance_mandatory ?? null, uses_textbook: uses_textbook ?? null, grade_received: grade_received || null,
      tags: validTags, comment: cleanComment, status, toxicity_score: scan.toxicity_score,
      risk_flags: scan.risk_flags, ip_hash: ipHash, user_agent_hash: uaHash, semester_window: semester,
      user_id: user_id || null,
    }).select("id").single();

    if (insertError) { logger.error("Insert error:", insertError); return NextResponse.json({ error: "Failed to save review" }, { status: 500, headers: NO_STORE_HEADERS }); }

    await Promise.all([
      supabase.from("rate_limits").insert({ anon_user_hash: anonUserHash, ip_hash: ipHash }),
      supabase.from("professor_courses").upsert({ professor_id, course_id }, { onConflict: "professor_id,course_id" }),
    ]);

    if (status === "live") {
      await supabase.rpc("refresh_professor_aggregates", { p_professor_id: professor_id });
    }

    // Admin notification — fetch course code once, reuse for both emails
    const { data: courseData } = await supabase.from("courses").select("code").eq("id", course_id).single();
    const courseCode = courseData?.code || "";
    try {
      await sendAdminNewReview({
        professorName: profResult.data?.name_en || "Unknown",
        courseCode,
        ratingQuality: rating_quality,
        ratingDifficulty: rating_difficulty,
        comment: cleanComment,
        status,
        reviewId: review.id,
        isLoggedIn: !!user_id,
      });
    } catch (err) { logger.error("[email] admin notification failed:", err); }

    // Email for auto-approved reviews — awaited so it completes before the serverless function exits
    if (status === "live" && user_id) {
      try {
        const { data: user } = await supabase
          .from("user_accounts").select("email, username").eq("id", user_id).single();
        logger.debug("[review] auto-approval email →", user ? user.username : "not found");
        if (user?.email) {
          const profName = profResult.data?.name_en || "the professor";
          const profSlug = profResult.data?.slug || "";
          await sendReviewLive(user.email, user.username, profName, courseCode, profSlug);
        }
      } catch (err) { logger.error("[email] auto-approval notify failed:", err); }
    }

    // Revalidate affected pages — only when review is live to avoid pointless rebuilds
    if (status === "live") {
      try {
        const profSlug = profResult.data.slug;
        const paths: string[] = [];
        if (profSlug) {
          revalidatePath(`/p/${profSlug}`, "layout");
          paths.push(`/p/${profSlug}`);
        }
        const { data: uni } = await supabase
          .from("universities")
          .select("slug")
          .eq("id", profResult.data.university_id)
          .single();
        if (uni) {
          revalidatePath(`/u/${uni.slug}`, "layout");
          paths.push(`/u/${uni.slug}`);
        }
        revalidatePath("/", "layout");
        paths.push("/");
        logger.info("REVALIDATE TRIGGERED [review submission]", paths);
      } catch {}
    }

    const messages: Record<string, string> = {
      live: "Your review has been published! Thank you for helping fellow students.",
      pending: "Your review has been submitted and is pending moderation. Most reviews are approved within 24 hours.",
      flagged: "Your review has been submitted and is being reviewed by our team.",
      removed: "Your review could not be published due to content policy violations.",
    };

    return NextResponse.json({
      success: true, review_id: review.id, status,
      auto_approved: status === "live",
      message: messages[status] || messages.pending,
    }, { status: 201, headers: NO_STORE_HEADERS });
  } catch (err) {
    logger.error("Review submission error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: NO_STORE_HEADERS });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await req.json();
    const anonUserHash = req.headers.get("x-anon-user-hash") || "";
    const sessionUser = await getSessionUser(req);
    const userId = sessionUser?.id || "";

    const { review_id, rating_quality, rating_difficulty, would_take_again, grade_received, tags, comment } = body;

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!review_id || !UUID_RE.test(review_id))
      return NextResponse.json({ error: "Invalid review ID" }, { status: 400, headers: NO_STORE_HEADERS });

    const { data: existing } = await supabase.from("reviews")
      .select("id, professor_id, anon_user_hash, user_id, status")
      .eq("id", review_id).single();

    if (!existing)
      return NextResponse.json({ error: "Review not found" }, { status: 404, headers: NO_STORE_HEADERS });

    // Allow edit if anon hash matches OR if the logged-in user_id matches the review's user_id
    const hashMatch = anonUserHash.length >= 8 && existing.anon_user_hash === anonUserHash;
    const userMatch = userId && UUID_RE.test(userId) && existing.user_id === userId;
    if (!hashMatch && !userMatch)
      return NextResponse.json({ error: "Not authorized to edit this review" }, { status: 403, headers: NO_STORE_HEADERS });

    if (existing.status === "removed")
      return NextResponse.json({ error: "Cannot edit a rejected review" }, { status: 400, headers: NO_STORE_HEADERS });

    const validRating = (v: number) => typeof v === "number" && v >= 0.5 && v <= 5.0 && (v * 10) % 5 === 0;
    if (rating_quality !== undefined && !validRating(rating_quality))
      return NextResponse.json({ error: "Invalid quality rating" }, { status: 400, headers: NO_STORE_HEADERS });
    if (rating_difficulty !== undefined && !validRating(rating_difficulty))
      return NextResponse.json({ error: "Invalid difficulty rating" }, { status: 400, headers: NO_STORE_HEADERS });

    const updates: Record<string, any> = {};
    if (rating_quality !== undefined) updates.rating_quality = rating_quality;
    if (rating_difficulty !== undefined) updates.rating_difficulty = rating_difficulty;
    if (would_take_again !== undefined) updates.would_take_again = would_take_again;
    if (grade_received !== undefined) updates.grade_received = grade_received || null;
    if (tags !== undefined) updates.tags = (tags || []).filter((t: string) => VALID_TAGS.includes(t as any)).slice(0, RATE_LIMITS.MAX_TAGS);
    if (comment !== undefined) {
      const cleanComment = comment.trim().slice(0, RATE_LIMITS.MAX_COMMENT_LENGTH)
        .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[REDACTED]")
        .replace(/\+?973\s?\d{4}\s?\d{4}/g, "[REDACTED]");
      updates.comment = cleanComment;
      // Re-scan on edit — prevents bypassing moderation via post-approval edits
      const scan = scanContent(cleanComment);
      updates.toxicity_score = scan.toxicity_score;
      updates.risk_flags = scan.risk_flags;
      if (scan.suggested_status === "removed") {
        updates.status = "removed";
      } else if (scan.suggested_status === "flagged") {
        updates.status = "flagged";
      } else if (existing.status === "live" || existing.status === "shadow") {
        updates.status = "pending";
      }
    } else if (existing.status === "live" || existing.status === "shadow") {
      // Rating/tag edits on live reviews also re-queue for moderation
      updates.status = "pending";
    }

    if (Object.keys(updates).length === 0)
      return NextResponse.json({ error: "No changes provided" }, { status: 400, headers: NO_STORE_HEADERS });

    updates.updated_at = new Date().toISOString();

    const { error: updateError } = await supabase.from("reviews").update(updates).eq("id", review_id);

    if (updateError) {
      logger.error("Review update error:", updateError);
      return NextResponse.json({ error: "Failed to update review" }, { status: 500, headers: NO_STORE_HEADERS });
    }

    // Refresh aggregates if review was live (it's now pending, so remove its contribution)
    if (existing.status === "live") {
      await supabase.rpc("refresh_professor_aggregates", { p_professor_id: existing.professor_id });
    }

    const wasLive = existing.status === "live" || existing.status === "shadow";
    return NextResponse.json({ success: true, went_to_moderation: wasLive }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    logger.error("Review update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
