"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "./UserProvider";

interface VoteCounts {
  [reviewId: string]: { up: number; down: number };
}

interface UserVotes {
  [reviewId: string]: string;
}

export function useReviewVotes(reviewIds: string[]) {
  const { user } = useUser();
  const [counts, setCounts] = useState<VoteCounts>({});
  const [userVotes, setUserVotes] = useState<UserVotes>({});

  useEffect(() => {
    if (reviewIds.length === 0) return;
    const params = new URLSearchParams({ review_ids: reviewIds.join(",") });
    if (user?.id) params.set("user_id", user.id);
    fetch(`/api/review-vote?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.counts) setCounts(data.counts);
        if (data.userVotes) setUserVotes(data.userVotes);
      })
      .catch(() => {});
  }, [reviewIds.join(","), user?.id]);

  return { counts, userVotes, setCounts, setUserVotes };
}

export default function ReviewVoteButtons({
  reviewId,
  upCount,
  downCount,
  userVote,
  onVote,
}: {
  reviewId: string;
  upCount: number;
  downCount: number;
  userVote: string | null;
  onVote: (reviewId: string, vote: "up" | "down") => void;
}) {
  const { user } = useUser();
  const router = useRouter();

  const handleVote = (vote: "up" | "down") => {
    if (!user) {
      router.push("/auth");
      return;
    }
    onVote(reviewId, vote);
  };

  return (
    <div className="flex items-center gap-1 mt-3 justify-end">
      <button
        onClick={() => handleVote("up")}
        className="flex items-center gap-1 text-xs transition-all active:scale-90 p-2 rounded-lg"
        style={{ color: userVote === "up" ? "var(--accent)" : "var(--text-tertiary)" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill={userVote === "up" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/>
        </svg>
        {upCount > 0 && <span className="font-semibold">{upCount}</span>}
      </button>
      <button
        onClick={() => handleVote("down")}
        className="flex items-center gap-1 text-xs transition-all active:scale-90 p-2 rounded-lg"
        style={{ color: userVote === "down" ? "#EF4444" : "var(--text-tertiary)" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill={userVote === "down" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"/>
        </svg>
        {downCount > 0 && <span className="font-semibold">{downCount}</span>}
      </button>
    </div>
  );
}
