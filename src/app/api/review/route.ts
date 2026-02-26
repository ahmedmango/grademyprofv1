import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { scanContent } from "@/lib/moderation";
import { VALID_TAGS, RATE_LIMITS } from "@/lib/constants";
import { getCurrentSemester } from "@/lib/utils";
import { NO_STORE_HEADERS } from "@/lib/api-headers";

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash = (hash << 5) - hash + str.charCodeAt(i); hash |= 0; }
  return Math.abs(hash).toString(36);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await req.json();
    const anonUserHash = req.headers.get("x-anon-user-hash") || "";
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = hashString(clientIp);
    const uaHash = hashString(req.headers.get("user-agent") || "");

    const { professor_id, course_id, rating_quality, rating_difficulty,
      would_take_again, attendance_mandatory, uses_textbook, grade_received, 
      tags, comment, user_id } = body;

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
      supabase.from("professors").select("id, university_id, slug").eq("id", professor_id).eq("is_active", true).single(),
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

    if (insertError) { console.error("Insert error:", insertError); return NextResponse.json({ error: "Failed to save review" }, { status: 500, headers: NO_STORE_HEADERS }); }

    supabase.from("rate_limits").insert({ anon_user_hash: anonUserHash, ip_hash: ipHash }).then();

    // Ensure professor ↔ course link exists for search
    supabase
      .from("professor_courses")
      .upsert({ professor_id, course_id }, { onConflict: "professor_id,course_id" })
      .then(() => {});

    if (status === "live") {
      await supabase.rpc("refresh_professor_aggregates", { p_professor_id: professor_id });
    }

    // Revalidate professor page and university page so changes appear immediately
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
      console.log("REVALIDATE TRIGGERED [review submission]", paths);
    } catch {}

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
    console.error("Review submission error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: NO_STORE_HEADERS });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await req.json();
    const anonUserHash = req.headers.get("x-anon-user-hash") || "";

    if (!anonUserHash || anonUserHash.length < 8)
      return NextResponse.json({ error: "Missing identity" }, { status: 400, headers: NO_STORE_HEADERS });

    const { review_id, rating_quality, rating_difficulty, would_take_again, grade_received, tags, comment } = body;

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!review_id || !UUID_RE.test(review_id))
      return NextResponse.json({ error: "Invalid review ID" }, { status: 400, headers: NO_STORE_HEADERS });

    const { data: existing } = await supabase.from("reviews")
      .select("id, professor_id, anon_user_hash, status")
      .eq("id", review_id).single();

    if (!existing)
      return NextResponse.json({ error: "Review not found" }, { status: 404, headers: NO_STORE_HEADERS });
    if (existing.anon_user_hash !== anonUserHash)
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
      const scan = scanContent(cleanComment);
      if (scan.suggested_status === "removed" || scan.suggested_status === "flagged") {
        updates.status = "pending";
      }
    }

    if (Object.keys(updates).length === 0)
      return NextResponse.json({ error: "No changes provided" }, { status: 400, headers: NO_STORE_HEADERS });

    updates.updated_at = new Date().toISOString();

    const { error: updateError } = await supabase.from("reviews").update(updates).eq("id", review_id);

    if (updateError) {
      console.error("Review update error:", updateError);
      return NextResponse.json({ error: "Failed to update review" }, { status: 500, headers: NO_STORE_HEADERS });
    }

    if (existing.status === "live") {
      await supabase.rpc("refresh_professor_aggregates", { p_professor_id: existing.professor_id });
    }

    return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error("Review update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
