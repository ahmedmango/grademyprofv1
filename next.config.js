// @ts-check
const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
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
          { key: "Cache-Control", value: "no-store" },
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
module.exports = withSentryConfig(nextConfig, {
  // Suppress noisy Sentry build output
  silent: true,
  // Upload source maps to Sentry for readable stack traces in prod
  // Requires SENTRY_AUTH_TOKEN env var (set in Vercel, not committed)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Automatically tree-shake Sentry logger statements in prod
  disableLogger: true,
  // Don't widen the CSP to include Sentry's tunnel — we handle CSP manually
  autoInstrumentServerFunctions: true,
  autoInstrumentAppDirectory: true,
});
