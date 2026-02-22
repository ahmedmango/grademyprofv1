import { NextRequest, NextResponse } from "next/server";

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const response = NextResponse.next();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.supabase.co https://*.supabase.in",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  response.headers.set("Content-Security-Policy", csp);

  if (pathname.startsWith("/api/")) {
    const ua = req.headers.get("user-agent") || "";

    if (pathname === "/api/review" || pathname === "/api/report" || pathname === "/api/suggest") {
      if (!ua || ua.length < 5 || /^(curl|wget|python-requests|Go-http|httpie|postman)/i.test(ua)) {
        return NextResponse.json({ error: "Request blocked" }, { status: 403 });
      }
      if (!rateLimit(`write:${ip}`, 20, 60000)) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
      }
    }

    if (!rateLimit(`api:${ip}`, 120, 60000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    if (pathname.startsWith("/api/admin/")) {
      if (!rateLimit(`admin:${ip}`, 30, 60000)) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
      }
    }
  }

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
