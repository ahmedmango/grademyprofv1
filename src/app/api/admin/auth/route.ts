import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { signJWT } from "@/lib/jwt";
import { NO_STORE_HEADERS } from "@/lib/api-headers";

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

    // Validate shared secret
    if (secret !== process.env.ADMIN_SECRET) {
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
    console.error("Admin auth error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
