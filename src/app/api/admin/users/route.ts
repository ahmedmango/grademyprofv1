import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateAdmin } from "@/lib/admin-auth";
import { NO_STORE_HEADERS } from "@/lib/api-headers";

export async function GET(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });

  const supabase = createServiceClient();
  const format = req.nextUrl.searchParams.get("format");

  const { data: users, error } = await supabase
    .from("user_accounts")
    .select("id, username, email, created_at, is_banned")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Users fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500, headers: NO_STORE_HEADERS });
  }

  const userIds = (users || []).map((u) => u.id);

  let reviewCounts: Record<string, number> = {};
  if (userIds.length > 0) {
    const { data: counts } = await supabase
      .from("reviews")
      .select("user_id")
      .in("user_id", userIds);

    if (counts) {
      for (const row of counts) {
        if (row.user_id) {
          reviewCounts[row.user_id] = (reviewCounts[row.user_id] || 0) + 1;
        }
      }
    }
  }

  const enriched = (users || []).map((u) => ({
    ...u,
    review_count: reviewCounts[u.id] || 0,
  }));

  if (format === "csv") {
    const header = "id,username,email,created_at,is_banned,review_count";
    const rows = enriched.map((u) =>
      `${u.id},"${u.username}","${u.email}",${u.created_at},${u.is_banned},${u.review_count}`
    );
    const csv = [header, ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=gmp-users.csv",
        ...NO_STORE_HEADERS,
      },
    });
  }

  return NextResponse.json({ users: enriched, total: enriched.length }, { headers: NO_STORE_HEADERS });
}
