"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function Error({
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
    <div className="px-5 pb-10 pt-16 text-center max-w-md mx-auto">
      <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--accent-soft)" }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <h1 className="font-display text-xl font-extrabold mb-2" style={{ color: "var(--text-primary)" }}>
        Something went wrong
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-tertiary)" }}>
        We hit an unexpected error. This is usually temporary.
      </p>
      <div className="flex gap-3 justify-center">
        <button
          onClick={reset}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          Try Again
        </button>
        <a
          href="/"
          className="px-5 py-2.5 rounded-xl text-sm font-semibold card-flat"
        >
          Home
        </a>
      </div>
    </div>
  );
}
