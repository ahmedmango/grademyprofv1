import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Policy", "10/day per user, 5/hour per IP");

    const ua = req.headers.get("user-agent") || "";
    if (process.env.NODE_ENV === "production" && pathname === "/api/review") {
      if (!ua || ua.length < 5 || /^(curl|wget|python-requests|Go-http)/i.test(ua)) {
        return NextResponse.json({ error: "Request blocked" }, { status: 403 });
      }
    }
    return response;
  }

  if (pathname !== "/" && pathname.endsWith("/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(0, -1);
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
