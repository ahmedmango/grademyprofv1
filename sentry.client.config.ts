import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Capture 10% of sessions as replays in prod, 100% when an error occurs
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Capture 10% of transactions for performance monitoring
  tracesSampleRate: 0.1,

  integrations: [
    Sentry.replayIntegration({
      // Mask all text and block all media to protect user privacy
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Don't send errors in development
  enabled: process.env.NODE_ENV === "production",
});
