import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { NO_STORE_HEADERS } from "@/lib/api-headers";

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
      console.error("Vote insert error:", error);
      return NextResponse.json({ error: "Failed to vote" }, { status: 500, headers: NO_STORE_HEADERS });
    }

    return NextResponse.json({ action: "added", vote }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error("Vote error:", err);
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

    const { data: votes } = await supabase
      .from("review_votes")
      .select("review_id, vote")
      .in("review_id", ids);

    const counts: Record<string, { up: number; down: number }> = {};
    for (const id of ids) counts[id] = { up: 0, down: 0 };
    for (const v of votes || []) {
      if (!counts[v.review_id]) counts[v.review_id] = { up: 0, down: 0 };
      counts[v.review_id][v.vote as "up" | "down"]++;
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
