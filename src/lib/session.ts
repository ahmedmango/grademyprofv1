import { NextRequest } from "next/server";
import { verifyJWT } from "@/lib/jwt";

const SESSION_SECRET = process.env.SESSION_SECRET || (
  process.env.NODE_ENV === "production"
    ? (() => { console.error("CRITICAL: SESSION_SECRET is not set in production"); return ""; })()
    : "dev-session-secret"
);

export async function getSessionUser(
  req: NextRequest,
): Promise<{ id: string; username: string; email: string } | null> {
  const token = req.cookies.get("gmp_session")?.value;
  if (!token) return null;

  const payload = await verifyJWT(token, SESSION_SECRET);
  if (!payload) return null;

  return {
    id: payload.sub as string,
    username: payload.username as string,
    email: payload.email as string,
  };
}
