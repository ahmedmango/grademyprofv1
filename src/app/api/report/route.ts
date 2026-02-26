import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { NO_STORE_HEADERS } from "@/lib/api-headers";

const VALID_REASONS = ["spam", "offensive", "inaccurate", "doxxing", "other"] as const;

export async function POST(req: NextRequest) {
  try {
    const { review_id, reason, detail } = await req.json();
    if (!review_id || !reason) return NextResponse.json({ error: "Missing review_id or reason" }, { status: 400, headers: NO_STORE_HEADERS });
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(review_id)) return NextResponse.json({ error: "Invalid review_id" }, { status: 400, headers: NO_STORE_HEADERS });
    if (!VALID_REASONS.includes(reason)) return NextResponse.json({ error: "Invalid reason" }, { status: 400, headers: NO_STORE_HEADERS });

    const supabase = createServiceClient();
    const { data: review } = await supabase.from("reviews").select("id").eq("id", review_id).eq("status", "live").single();
    if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404, headers: NO_STORE_HEADERS });

    const { error: insertError } = await supabase.from("reports").insert({
      review_id, reason, detail: (detail || "").trim().slice(0, 500),
    });
    if (insertError) return NextResponse.json({ error: "Failed to submit report" }, { status: 500, headers: NO_STORE_HEADERS });

    const { count } = await supabase.from("reports").select("*", { count: "exact", head: true }).eq("review_id", review_id);
    if ((count || 0) >= 3) {
      await supabase.from("reviews").update({ status: "flagged", updated_at: new Date().toISOString() })
        .eq("id", review_id).eq("status", "live");
    }

    return NextResponse.json({ success: true, message: "Thank you for reporting. Our team will review this." }, { status: 201, headers: NO_STORE_HEADERS });
  } catch { return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: NO_STORE_HEADERS }); }
}
