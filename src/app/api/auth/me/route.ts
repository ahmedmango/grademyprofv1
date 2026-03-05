import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/jwt";
import { NO_STORE_HEADERS } from "@/lib/api-headers";

const SESSION_SECRET = process.env.SESSION_SECRET || (
  process.env.NODE_ENV === "production"
    ? (() => { console.error("CRITICAL: SESSION_SECRET is not set in production"); return ""; })()
    : "dev-session-secret"
);

export async function GET(req: NextRequest) {
  const token = req.cookies.get("gmp_session")?.value;
  if (!token) {
    return NextResponse.json({ user: null }, { headers: NO_STORE_HEADERS });
  }

  const payload = await verifyJWT(token, SESSION_SECRET);
  if (!payload) {
    return NextResponse.json({ user: null }, { headers: NO_STORE_HEADERS });
  }

  return NextResponse.json(
    {
      user: {
        id: payload.sub as string,
        username: payload.username as string,
        email: payload.email as string,
      },
    },
    { headers: NO_STORE_HEADERS },
  );
}
