import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { NO_STORE_HEADERS } from "@/lib/api-headers";
import { sendReviewMilestone } from "@/lib/email";
import logger from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { review_id, vote, user_id } = await req.json();

    if (!review_id || !vote || !user_id)
      return NextResponse.json({ error: "Missing fields" }, { status: 400, headers: NO_STORE_HEADERS });

    if (vote !== "up" && vote !== "down")
      return NextResponse.json({ error: "Invalid vote" }, { status: 400, headers: NO_STORE_HEADERS });

    const { data: existing } = await supabase
      .from("review_votes")
      .select("id, vote")
      .eq("review_id", review_id)
      .eq("user_id", user_id)
      .maybeSingle();

    if (existing) {
      if (existing.vote === vote) {
        await supabase.from("review_votes").delete().eq("id", existing.id);
        return NextResponse.json({ action: "removed", vote: null }, { headers: NO_STORE_HEADERS });
      }
      await supabase.from("review_votes").update({ vote }).eq("id", existing.id);
      return NextResponse.json({ action: "changed", vote }, { headers: NO_STORE_HEADERS });
    }

    const { error } = await supabase.from("review_votes").insert({ review_id, user_id, vote });
    if (error) {
      logger.error("Vote insert error:", error);
      return NextResponse.json({ error: "Failed to vote" }, { status: 500, headers: NO_STORE_HEADERS });
    }

    // 5-upvote milestone email — awaited before response so Vercel doesn't kill it
    if (vote === "up") {
      try {
        const { count: upCount } = await supabase
          .from("review_votes")
          .select("*", { count: "exact", head: true })
          .eq("review_id", review_id)
          .eq("vote", "up");

        if (upCount === 5) {
          const { data: review } = await supabase
            .from("reviews")
            .select("user_id, courses ( code ), professors ( name_en, slug )")
            .eq("id", review_id)
            .single();

          if (review?.user_id) {
            const { data: author } = await supabase
              .from("user_accounts")
              .select("email, username")
              .eq("id", review.user_id)
              .single();

            if (author?.email) {
              const profName = (review as any).professors?.name_en || "the professor";
              const profSlug = (review as any).professors?.slug || "";
              const courseCode = (review as any).courses?.code || "";
              await sendReviewMilestone(author.email, author.username, profName, courseCode, profSlug);
            }
          }
        }
      } catch (err) {
        logger.error("[review-vote] milestone email failed:", err);
      }
    }

    return NextResponse.json({ action: "added", vote }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    logger.error("Vote error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: NO_STORE_HEADERS });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceClient();
    const reviewIds = req.nextUrl.searchParams.get("review_ids");
    const userId = req.nextUrl.searchParams.get("user_id");

    if (!reviewIds)
      return NextResponse.json({ error: "Missing review_ids" }, { status: 400, headers: NO_STORE_HEADERS });

    const ids = reviewIds.split(",").filter(Boolean);

    const [votesResult, boostResult] = await Promise.all([
      supabase.from("review_votes").select("review_id, vote").in("review_id", ids),
      supabase.from("reviews").select("id, upvote_boost").in("id", ids),
    ]);

    const counts: Record<string, { up: number; down: number }> = {};
    for (const id of ids) counts[id] = { up: 0, down: 0 };
    for (const v of votesResult.data || []) {
      if (!counts[v.review_id]) counts[v.review_id] = { up: 0, down: 0 };
      counts[v.review_id][v.vote as "up" | "down"]++;
    }
    // Add admin upvote boost
    for (const r of boostResult.data || []) {
      if (r.upvote_boost > 0) {
        if (!counts[r.id]) counts[r.id] = { up: 0, down: 0 };
        counts[r.id].up += r.upvote_boost;
      }
    }

    let userVotes: Record<string, string> = {};
    if (userId) {
      const { data: uv } = await supabase
        .from("review_votes")
        .select("review_id, vote")
        .eq("user_id", userId)
        .in("review_id", ids);
      for (const v of uv || []) userVotes[v.review_id] = v.vote;
    }

    return NextResponse.json({ counts, userVotes }, { headers: NO_STORE_HEADERS });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
