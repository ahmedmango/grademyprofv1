import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { NO_STORE_HEADERS } from "@/lib/api-headers";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("u")?.trim().toLowerCase();
  if (!username || username.length < 3) {
    return NextResponse.json({ available: false }, { headers: NO_STORE_HEADERS });
  }

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("user_accounts")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  return NextResponse.json({ available: !data }, { headers: NO_STORE_HEADERS });
}
