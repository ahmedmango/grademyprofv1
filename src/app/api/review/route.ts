import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { scanContent } from "@/lib/moderation";
import { VALID_TAGS, RATE_LIMITS } from "@/lib/constants";
import { getCurrentSemester } from "@/lib/utils";

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await req.json();

    const anonUserHash = req.headers.get("x-anon-user-hash") || "";
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const userAgent = req.headers.get("user-agent") || "";
    const ipHash = hashString(clientIp);
    const uaHash = hashString(userAgent);

    // ── Validate fields ─────────────────────────────────────────
    const {
      professor_id, course_id,
      rating_quality, rating_difficulty,
      would_take_again, attendance_mandatory, uses_textbook,
      tags, comment,
    } = body;

    if (!professor_id || !course_id || !rating_quality || !rating_difficulty) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!anonUserHash || anonUserHash.length < 8) {
      return NextResponse.json({ error: "Invalid identity token" }, { status: 400 });
    }

    // Validate 0.5 increments
    const validRating = (v: number) => v >= 0.5 && v <= 5.0 && v % 0.5 === 0;
    if (!validRating(rating_quality) || !validRating(rating_difficulty)) {
      return NextResponse.json({ error: "Ratings must be 0.5–5.0 in 0.5 increments" }, { status: 400 });
    }

    const validTags = (tags || []).filter((t: string) => VALID_TAGS.includes(t as any)).slice(0, RATE_LIMITS.MAX_TAGS);
    const cleanComment = (comment || "").trim().slice(0, RATE_LIMITS.MAX_COMMENT_LENGTH);

    // ── Verify professor + course exist ─────────────────────────
    const { data: prof } = await supabase
      .from("professors").select("id, university_id")
      .eq("id", professor_id).eq("is_active", true).single();

    if (!prof) return NextResponse.json({ error: "Professor not found" }, { status: 404 });

    const { data: course } = await supabase
      .from("courses").select("id").eq("id", course_id).single();

    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

    // ── Rate limiting ───────────────────────────────────────────
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

    const { count: userDayCount } = await supabase
      .from("rate_limits").select("*", { count: "exact", head: true })
      .eq("anon_user_hash", anonUserHash).gte("created_at", oneDayAgo);

    if ((userDayCount || 0) >= RATE_LIMITS.MAX_REVIEWS_PER_DAY) {
      return NextResponse.json({ error: "Daily review limit reached. Try again tomorrow." }, { status: 429 });
    }

    const { count: ipHourCount } = await supabase
      .from("rate_limits").select("*", { count: "exact", head: true })
      .eq("ip_hash", ipHash).gte("created_at", oneHourAgo);

    if ((ipHourCount || 0) >= RATE_LIMITS.MAX_REVIEWS_PER_IP_HOUR) {
      return NextResponse.json({ error: "Too many submissions from this network." }, { status: 429 });
    }

    // ── Duplicate check ─────────────────────────────────────────
    const semester = getCurrentSemester();
    const { data: existing } = await supabase
      .from("reviews").select("id")
      .eq("anon_user_hash", anonUserHash)
      .eq("professor_id", professor_id)
      .eq("course_id", course_id)
      .eq("semester_window", semester)
      .neq("status", "removed")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "You already reviewed this professor for this course this semester." }, { status: 409 });
    }

    // ── Content moderation ──────────────────────────────────────
    const scan = scanContent(cleanComment);

    // ── Brigading detection ─────────────────────────────────────
    const fiveMinAgo = new Date(Date.now() - 300000).toISOString();
    const { count: recentSameProf } = await supabase
      .from("reviews").select("*", { count: "exact", head: true })
      .eq("professor_id", professor_id).gte("created_at", fiveMinAgo);

    if ((recentSameProf || 0) >= 5) {
      scan.risk_flags.brigading_suspect = true;
      scan.suggested_status = "flagged";
    }

    // Reviews ALWAYS start as pending (or worse if flagged/removed by content scan)
    // Moderators approve them to 'live'
    const status = scan.suggested_status === "removed" ? "removed"
      : scan.suggested_status === "flagged" ? "flagged"
      : "pending";

    // ── Insert review ───────────────────────────────────────────
    const { data: review, error: insertError } = await supabase
      .from("reviews")
      .insert({
        professor_id,
        course_id,
        university_id: prof.university_id,
        anon_user_hash: anonUserHash,
        rating_quality,
        rating_difficulty,
        would_take_again: would_take_again ?? null,
        attendance_mandatory: attendance_mandatory ?? null,
        uses_textbook: uses_textbook ?? null,
        tags: validTags,
        comment: cleanComment,
        status,
        toxicity_score: scan.toxicity_score,
        risk_flags: scan.risk_flags,
        ip_hash: ipHash,
        user_agent_hash: uaHash,
        semester_window: semester,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json({ error: "Failed to save review" }, { status: 500 });
    }

    // Record rate limit
    await supabase.from("rate_limits").insert({ anon_user_hash: anonUserHash, ip_hash: ipHash });

    return NextResponse.json({
      success: true,
      review_id: review.id,
      status,
      message: "Your review has been submitted and is pending moderation. It will appear once approved.",
      points_earned: cleanComment.length >= 30 ? 50 : 30,
    }, { status: 201 });

  } catch (err) {
    console.error("Review submission error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
