import { NextRequest } from "next/server";
import { verifyJWT } from "@/lib/jwt";

export interface AdminSession {
  id: string;
  email: string;
  role: string;
}

const ADMIN_JWT_SECRET =
  process.env.ADMIN_JWT_SECRET || "dev-admin-jwt-secret-change-in-prod";

export async function authenticateAdmin(req: NextRequest): Promise<AdminSession | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const payload = await verifyJWT(token, ADMIN_JWT_SECRET);
  if (!payload) return null;

  const id = payload.sub as string;
  const email = payload.email as string;
  const role = payload.role as string;
  if (!id || !email || !role) return null;

  return { id, email, role };
}
