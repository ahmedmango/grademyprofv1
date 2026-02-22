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
  return null;
}
