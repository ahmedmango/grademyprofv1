import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export interface AdminSession {
  id: string;
  email: string;
  role: string;
}

// Simple admin auth via Authorization header with admin secret + email
// Header format: "Bearer <ADMIN_SECRET>:<admin_email>"
// In production, replace with proper Supabase Auth or NextAuth
export async function authenticateAdmin(req: NextRequest): Promise<AdminSession | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const [secret, email] = token.split(":");

  if (secret !== process.env.ADMIN_SECRET || !email) return null;

  const supabase = createServiceClient();
  const { data: admin } = await supabase
    .from("admin_users")
    .select("id, email, role")
    .eq("email", email)
    .single();

  if (!admin) return null;

  return { id: admin.id, email: admin.email, role: admin.role };
}

// For use in admin page (client-side stores credentials in sessionStorage)
export function getAdminAuthHeader(email: string): string {
  // In client, we read the secret from login form — stored in sessionStorage
  const secret = typeof window !== "undefined" ? sessionStorage.getItem("admin_secret") : "";
  return `Bearer ${secret}:${email}`;
}
