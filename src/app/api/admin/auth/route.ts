import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { signJWT } from "@/lib/jwt";
import { NO_STORE_HEADERS } from "@/lib/api-headers";
import logger from "@/lib/logger";

/** Constant-time string comparison to prevent timing attacks */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still compare full length of `b` to avoid leaking length info
    let result = 1;
    for (let i = 0; i < b.length; i++) result |= b.charCodeAt(i);
    return false && result === 0; // always false, but compiler can't optimize away the loop
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || (
  process.env.NODE_ENV === "production"
    ? (() => { console.error("CRITICAL: ADMIN_JWT_SECRET is not set in production"); return ""; })()
    : "dev-admin-jwt-secret"
);

export async function POST(req: NextRequest) {
  try {
    const { email, secret } = await req.json();

    if (!email || !secret) {
      return NextResponse.json(
        { error: "Email and secret required" },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    // Validate shared secret (timing-safe comparison)
    const expected = process.env.ADMIN_SECRET || "";
    if (!expected || !timingSafeEqual(secret, expected)) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401, headers: NO_STORE_HEADERS },
      );
    }

    // Verify the email is a known admin
    const supabase = createServiceClient();
    const { data: admin } = await supabase
      .from("admin_users")
      .select("id, email, role")
      .eq("email", email.trim().toLowerCase())
      .single();

    if (!admin) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401, headers: NO_STORE_HEADERS },
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const token = await signJWT(
      {
        sub: admin.id,
        email: admin.email,
        role: admin.role,
        iat: now,
        exp: now + 8 * 60 * 60, // 8 hours
      },
      ADMIN_JWT_SECRET,
    );

    return NextResponse.json({ token }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    logger.error("Admin auth error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
