"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { getAnonUserHash } from "@/lib/anon-identity";

const REQUIRED_APPROVED = 1;
const CACHE_KEY = "gmp_gate_status";
const CACHE_TTL = 5 * 60 * 1000;

interface GateContextType {
  reviewCount: number;
  approvedCount: number;
  isUnlocked: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const GateContext = createContext<GateContextType>({
  reviewCount: 0,
  approvedCount: 0,
  isUnlocked: false,
  loading: true,
  refresh: async () => {},
});

export function useGate() {
  return useContext(GateContext);
}

export function GateProvider({ children }: { children: ReactNode }) {
  const [reviewCount, setReviewCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCount = async () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { total, approved, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL) {
          setReviewCount(total);
          setApprovedCount(approved);
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
        const total = data.count || 0;
        const approved = data.approved_count || 0;
        setReviewCount(total);
        setApprovedCount(approved);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ total, approved, ts: Date.now() }));
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
    <GateContext.Provider value={{
      reviewCount,
      approvedCount,
      isUnlocked: approvedCount >= REQUIRED_APPROVED,
      loading,
      refresh,
    }}>
      {children}
    </GateContext.Provider>
  );
}
