"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import type { VoteType } from "@/lib/types";

interface VoteButtonsProps {
  postId: string;
  upvotes: number;
  downvotes: number;
  userVote: VoteType | null;
  isAuthenticated: boolean;
  onAuthRequired: () => void;
}

export function VoteButtons({
  postId,
  upvotes: initialUpvotes,
  downvotes: initialDownvotes,
  userVote: initialUserVote,
  isAuthenticated,
  onAuthRequired,
}: VoteButtonsProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState<VoteType | null>(initialUserVote);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const handleVote = async (voteType: VoteType) => {
    if (!isAuthenticated) {
      onAuthRequired();
      return;
    }

    if (loading) return;
    setLoading(true);

    // Optimistic update
    const prevUpvotes = upvotes;
    const prevDownvotes = downvotes;
    const prevUserVote = userVote;

    if (userVote === voteType) {
      // Toggle off
      setUserVote(null);
      if (voteType === "slop") setUpvotes((v) => v - 1);
      else setDownvotes((v) => v - 1);
    } else if (userVote) {
      // Switch vote
      setUserVote(voteType);
      if (voteType === "slop") {
        setUpvotes((v) => v + 1);
        setDownvotes((v) => v - 1);
      } else {
        setDownvotes((v) => v + 1);
        setUpvotes((v) => v - 1);
      }
    } else {
      // New vote
      setUserVote(voteType);
      if (voteType === "slop") setUpvotes((v) => v + 1);
      else setDownvotes((v) => v + 1);
    }

    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId, vote_type: voteType }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Rollback
        setUpvotes(prevUpvotes);
        setDownvotes(prevDownvotes);
        setUserVote(prevUserVote);
        return;
      }

      // Sync with server counts
      setUpvotes(data.upvotes);
      setDownvotes(data.downvotes);
      setUserVote(data.user_vote);
    } catch {
      // Rollback
      setUpvotes(prevUpvotes);
      setDownvotes(prevDownvotes);
      setUserVote(prevUserVote);
    } finally {
      setLoading(false);
    }
  };

  // Also sync props when they change (e.g., from parent re-fetch)
  // We intentionally use initialUpvotes/initialDownvotes only for initial state

  return (
    <div className="flex items-center gap-2">
      {/* SLOP! (upvote) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleVote("slop");
        }}
        disabled={loading}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
          userVote === "slop"
            ? "bg-green-600/20 text-green-400 border border-green-500/50 scale-105"
            : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 hover:text-green-400"
        } ${loading ? "opacity-50" : ""}`}
      >
        <span className="text-base">🗑️</span>
        <span>PURE SLOP</span>
        <span
          className={`ml-1 ${userVote === "slop" ? "text-green-300" : "text-zinc-500"}`}
        >
          {upvotes}
        </span>
      </button>

      {/* Nah, too clean (downvote) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleVote("clean");
        }}
        disabled={loading}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
          userVote === "clean"
            ? "bg-orange-600/20 text-orange-400 border border-orange-500/50 scale-105"
            : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 hover:text-orange-400"
        } ${loading ? "opacity-50" : ""}`}
      >
        <span className="text-base">👨‍🍳</span>
        <span>NOT SLOPPY ENOUGH</span>
        <span
          className={`ml-1 ${userVote === "clean" ? "text-orange-300" : "text-zinc-500"}`}
        >
          {downvotes}
        </span>
      </button>
    </div>
  );
}
