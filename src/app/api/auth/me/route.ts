import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/jwt";
import { NO_STORE_HEADERS } from "@/lib/api-headers";

const SESSION_SECRET =
  process.env.SESSION_SECRET || "dev-session-secret-change-in-prod";

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
