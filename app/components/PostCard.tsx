"use client";

import { Post, getSlopColor, timeAgo } from "@/lib/types";
import { SlopMeter } from "./SlopMeter";
import { VoteButtons } from "./VoteButtons";
import type { VoteType } from "@/lib/types";

interface PostCardProps {
  post: Post;
  userVote: VoteType | null;
  isAuthenticated: boolean;
  onAuthRequired: () => void;
  onClick: () => void;
}

export function PostCard({
  post,
  userVote,
  isAuthenticated,
  onAuthRequired,
  onClick,
}: PostCardProps) {
  const username = post.username || post.profiles?.username || "Anonymous";
  const slopColor = getSlopColor(post.slop_score);

  return (
    <div
      onClick={onClick}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 transition-all cursor-pointer group"
    >
      {/* Header: username + time */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-purple-600/50 flex items-center justify-center text-xs font-bold text-purple-300">
            {username[0].toUpperCase()}
          </div>
          <span className="text-sm font-medium text-zinc-300">{username}</span>
        </div>
        <span className="text-xs text-zinc-500">{timeAgo(post.created_at)}</span>
      </div>

      {/* Content preview */}
      <p className="text-zinc-200 text-sm leading-relaxed mb-4 line-clamp-4">
        {post.content}
      </p>

      {/* Slop meter */}
      <div className="mb-3">
        <SlopMeter score={post.slop_score} size="sm" />
      </div>

      {/* AI Roast */}
      <div className="mb-4 px-3 py-2 bg-zinc-800/50 rounded-lg border-l-2 border-purple-500">
        <p className={`text-xs ${slopColor} italic`}>
          &ldquo;{post.roast}&rdquo;
        </p>
        <p className="text-[10px] text-zinc-500 mt-1">— AI Slop Judge</p>
      </div>

      {/* Vote buttons */}
      <VoteButtons
        postId={post.id}
        upvotes={post.upvotes}
        downvotes={post.downvotes}
        userVote={userVote}
        isAuthenticated={isAuthenticated}
        onAuthRequired={onAuthRequired}
      />
    </div>
  );
}
