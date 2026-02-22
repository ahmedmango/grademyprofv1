"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { getAnonUserHash } from "@/lib/anon-identity";

const REQUIRED_REVIEWS = 3;
const CACHE_KEY = "gmp_review_count";
const CACHE_TTL = 5 * 60 * 1000;

interface GateContextType {
  reviewCount: number;
  isUnlocked: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const GateContext = createContext<GateContextType>({
  reviewCount: 0,
  isUnlocked: false,
  loading: true,
  refresh: async () => {},
});

export function useGate() {
  return useContext(GateContext);
}

export function GateProvider({ children }: { children: ReactNode }) {
  const [reviewCount, setReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCount = async () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { count, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL) {
          setReviewCount(count);
          setLoading(false);
          return;
        }
      }
    } catch {}
    try {
      const hash = await getAnonUserHash();
      const res = await fetch("/api/my-reviews", {
        headers: { "x-anon-user-hash": hash },
      });
      if (res.ok) {
        const data = await res.json();
        const count = data.count || 0;
        setReviewCount(count);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ count, ts: Date.now() }));
        } catch {}
      }
    } catch {}
    setLoading(false);
  };

  const refresh = async () => {
    try { localStorage.removeItem(CACHE_KEY); } catch {}
    await fetchCount();
  };

  useEffect(() => { fetchCount(); }, []);

  return (
    <GateContext.Provider value={{ reviewCount, isUnlocked: reviewCount >= REQUIRED_REVIEWS, loading, refresh }}>
      {children}
    </GateContext.Provider>
  );
}

export default function ReviewGateBlock() {
  const { reviewCount, loading } = useGate();
  const remaining = Math.max(0, REQUIRED_REVIEWS - reviewCount);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
      </div>
    );
  }

  return (
    <div className="px-5 py-16 text-center">
      <div className="max-w-sm mx-auto">
        <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: "var(--accent-soft)", border: "2px solid var(--accent)" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h2 className="font-display text-xl font-extrabold mb-2" style={{ color: "var(--text-primary)" }}>Ratings are locked</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          Help your fellow students! Write <strong style={{ color: "var(--accent)" }}>{remaining} more</strong> {remaining === 1 ? "review" : "reviews"} to unlock all professor ratings.
        </p>
        <div className="mb-6">
          <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--text-tertiary)" }}>
            <span>{reviewCount} / {REQUIRED_REVIEWS} reviews</span>
            <span>{Math.round((reviewCount / REQUIRED_REVIEWS) * 100)}%</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ background: "var(--accent)", width: `${Math.min((reviewCount / REQUIRED_REVIEWS) * 100, 100)}%` }} />
          </div>
        </div>
        <a href="/search" className="inline-block px-8 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 active:scale-[0.97]" style={{ background: "var(--accent)", color: "#fff", boxShadow: "0 4px 16px rgba(217,80,48,0.3)" }}>
          Find a Professor to Rate →
        </a>
        <p className="text-xs mt-4" style={{ color: "var(--text-tertiary)" }}>Your reviews are anonymous and help everyone make better choices.</p>
      </div>
    </div>
  );
}
