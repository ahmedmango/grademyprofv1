/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { domains: [] },
  async headers() {
    const isDev = process.env.NODE_ENV === "development";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://grademyprofessor.bh";
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: isDev ? "*" : appUrl },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, x-anon-user-hash, Authorization" },
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.grademyprofessor.bh" }],
        destination: "https://grademyprofessor.bh/:path*",
        permanent: true,
      },
    ];
  },
};
module.exports = nextConfig;
