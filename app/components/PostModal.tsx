"use client";

import { useEffect, useCallback } from "react";
import { Post, getSlopColor, timeAgo } from "@/lib/types";
import { SlopMeter } from "./SlopMeter";
import { VoteButtons } from "./VoteButtons";
import { ShareButton } from "./ShareButton";
import type { VoteType } from "@/lib/types";

interface PostModalProps {
  post: Post;
  userVote: VoteType | null;
  isAuthenticated: boolean;
  onAuthRequired: () => void;
  onClose: () => void;
}

export function PostModal({
  post,
  userVote,
  isAuthenticated,
  onAuthRequired,
  onClose,
}: PostModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  const username = post.username || post.profiles?.username || "Anonymous";
  const slopColor = getSlopColor(post.slop_score);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-600/50 flex items-center justify-center text-sm font-bold text-purple-300">
              {username[0].toUpperCase()}
            </div>
            <div>
              <span className="text-sm font-medium text-zinc-200">
                {username}
              </span>
              <span className="text-xs text-zinc-500 ml-2">
                {timeAgo(post.created_at)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors text-xl cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap mb-6">
            {post.content}
          </p>

          {/* Slop Meter */}
          <div className="mb-6">
            <SlopMeter score={post.slop_score} size="lg" />
          </div>

          {/* AI Roast */}
          <div className="bg-purple-950/30 border border-purple-800/50 rounded-xl p-4 mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-1">
              🤖 AI Slop Judge
            </p>
            <p className={`${slopColor} font-semibold italic`}>
              &ldquo;{post.roast}&rdquo;
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <VoteButtons
              postId={post.id}
              upvotes={post.upvotes}
              downvotes={post.downvotes}
              userVote={userVote}
              isAuthenticated={isAuthenticated}
              onAuthRequired={onAuthRequired}
            />
            <div className="flex items-center gap-2 ml-auto">
              <ShareButton id={post.id} />
              <a
                href={`/post/${post.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all border border-zinc-700"
              >
                ↗ Open
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
