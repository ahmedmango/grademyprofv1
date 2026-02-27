"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "sans-serif", padding: "20px", textAlign: "center" }}>
          <h2 style={{ marginBottom: "8px", fontSize: "20px" }}>Something went wrong</h2>
          <p style={{ color: "#666", marginBottom: "20px", fontSize: "14px" }}>
            An unexpected error occurred. Our team has been notified.
          </p>
          <button
            onClick={reset}
            style={{ padding: "10px 20px", background: "#E87B35", color: "#fff", border: "none", borderRadius: "10px", fontSize: "14px", cursor: "pointer", fontWeight: 600 }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
