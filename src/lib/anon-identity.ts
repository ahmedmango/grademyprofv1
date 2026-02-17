"use client";

const STORAGE_KEY = "gmp_anon_id";
const SALT = "gmp-bh-2025";

export async function getAnonUserHash(): Promise<string> {
  // Check localStorage cache first
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) return cached;
  }

  try {
    // Dynamic import to avoid SSR issues
    const FingerprintJS = await import("@fingerprintjs/fingerprintjs");
    const fp = await FingerprintJS.load();
    const result = await fp.get();

    const encoder = new TextEncoder();
    const data = encoder.encode(result.visitorId + SALT);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, hash);
    }
    return hash;
  } catch {
    // Fallback: random ID persisted in localStorage
    const fallback = crypto.randomUUID().replace(/-/g, "");
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, fallback);
    }
    return fallback;
  }
}
