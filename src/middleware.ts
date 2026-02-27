import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ---------------------------------------------------------------------------
// Rate limiting — distributed via Upstash Redis when env vars are present,
// falls back to in-process Map (resets on cold start) for local dev / before
// Upstash is configured.
// ---------------------------------------------------------------------------

type Limiter = { check: (ip: string) => Promise<boolean> };

function makeUpstashLimiters(): { write: Limiter; api: Limiter; admin: Limiter; auth: Limiter } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const redis = new Redis({ url, token });
  // ephemeralCache keeps a short-lived in-memory copy per edge instance to
  // reduce redundant Redis round-trips for the same IP within a request burst.
  const cache = new Map();

  const make = (prefix: string, limit: number): Limiter => {
    const rl = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, "1 m"),
      prefix: `rl:${prefix}`,
      ephemeralCache: cache,
    });
    return { check: async (ip) => (await rl.limit(ip)).success };
  };

  return {
    write: make("write", 20),
    api: make("api", 120),
    admin: make("admin", 30),
    auth: make("auth", 5), // strict brute-force limit for login endpoints
  };
}

// In-process fallback (single-instance only — not distributed)
const fallbackMap = new Map<string, { count: number; resetAt: number }>();

function inMemoryLimit(key: string, limit: number): boolean {
  const now = Date.now();
  const entry = fallbackMap.get(key);
  if (!entry || now > entry.resetAt) {
    fallbackMap.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

// Initialised once at module load (edge runtime keeps this alive across requests
// on the same instance, Redis connection is reused).
const upstash = makeUpstashLimiters();

async function allowed(
  limiterKey: "write" | "api" | "admin" | "auth",
  ip: string,
  fallbackLimit: number,
): Promise<boolean> {
  if (upstash) return upstash[limiterKey].check(ip);
  return inMemoryLimit(`${limiterKey}:${ip}`, fallbackLimit);
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const response = NextResponse.next();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // Security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");

  // CSP — unsafe-eval kept only for dev builds (Next.js requires it in dev)
  const isProd = process.env.NODE_ENV === "production";
  const scriptSrc = isProd
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

  const csp = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.supabase.co https://*.supabase.in",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  response.headers.set("Content-Security-Policy", csp);

  // Rate limiting
  if (pathname.startsWith("/api/")) {
    const ua = req.headers.get("user-agent") || "";
    const isWriteEndpoint = ["/api/review", "/api/report", "/api/suggest", "/api/revalidate"].includes(pathname);

    if (isWriteEndpoint) {
      if (!ua || ua.length < 5 || /^(curl|wget|python-requests|Go-http|httpie|postman)/i.test(ua)) {
        return NextResponse.json({ error: "Request blocked" }, { status: 403 });
      }
      if (!(await allowed("write", ip, 20))) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
      }
    }

    if (!(await allowed("api", ip, 120))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    if (pathname.startsWith("/api/admin/")) {
      if (!(await allowed("admin", ip, 30))) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
      }
    }

    // Strict brute-force protection on admin login (5 attempts/min per IP)
    if (pathname === "/api/admin/auth") {
      if (!(await allowed("auth", ip, 5))) {
        return NextResponse.json({ error: "Too many login attempts. Try again later." }, { status: 429 });
      }
    }
  }

  // Strip trailing slashes
  if (pathname !== "/" && pathname.endsWith("/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(0, -1);
    return NextResponse.redirect(url, 308);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
