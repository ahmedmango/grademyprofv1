import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateAdmin } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { review_id, action } = body;

  if (!review_id || !action) {
    return NextResponse.json({ error: "Missing review_id or action" }, { status: 400 });
  }

  const validActions = ["approve", "reject", "shadow", "flag"] as const;
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: `Invalid action. Must be: ${validActions.join(", ")}` }, { status: 400 });
  }

  const statusMap: Record<string, string> = {
    approve: "live",
    reject: "removed",
    shadow: "shadow",
    flag: "flagged",
  };

  const supabase = createServiceClient();

  // Get the review first (to know professor_id for aggregate refresh)
  const { data: review } = await supabase
    .from("reviews")
    .select("id, professor_id, status")
    .eq("id", review_id)
    .single();

  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  const newStatus = statusMap[action];
  const oldStatus = review.status;

  // Update review status
  const { error: updateError } = await supabase
    .from("reviews")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", review_id);

  if (updateError) {
    console.error("Update error:", updateError);
    return NextResponse.json({ error: "Failed to update review" }, { status: 500 });
  }

  // Refresh aggregates if the review became live or was un-lived
  if (newStatus === "live" || oldStatus === "live") {
    await supabase.rpc("refresh_professor_aggregates", {
      p_professor_id: review.professor_id,
    });
  }

  return NextResponse.json({
    success: true,
    review_id,
    old_status: oldStatus,
    new_status: newStatus,
    message: `Review ${action}d successfully.`,
  });
}

// Bulk action endpoint
export async function PUT(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only super_admin can bulk-action
  if (admin.role !== "super_admin" && admin.role !== "moderator") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await req.json();
  const { review_ids, action } = body;

  if (!Array.isArray(review_ids) || review_ids.length === 0 || !action) {
    return NextResponse.json({ error: "Missing review_ids array or action" }, { status: 400 });
  }

  if (review_ids.length > 50) {
    return NextResponse.json({ error: "Max 50 reviews per bulk action" }, { status: 400 });
  }

  const statusMap: Record<string, string> = {
    approve: "live",
    reject: "removed",
    shadow: "shadow",
    flag: "flagged",
  };

  const newStatus = statusMap[action];
  if (!newStatus) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Get reviews to find affected professors
  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, professor_id, status")
    .in("id", review_ids);

  // Update all
  const { error } = await supabase
    .from("reviews")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .in("id", review_ids);

  if (error) {
    return NextResponse.json({ error: "Bulk update failed" }, { status: 500 });
  }

  // Refresh aggregates for affected professors
  const professorIds = [...new Set((reviews || []).map((r) => r.professor_id))];
  for (const profId of professorIds) {
    await supabase.rpc("refresh_professor_aggregates", { p_professor_id: profId });
  }

  return NextResponse.json({
    success: true,
    updated_count: review_ids.length,
    affected_professors: professorIds.length,
  });
}
