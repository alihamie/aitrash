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
  currentUserId?: string | null;
  onDelete?: (id: string) => void;
}

export function PostCard({
  post,
  userVote,
  isAuthenticated,
  onAuthRequired,
  onClick,
  currentUserId,
  onDelete,
}: PostCardProps) {
  const username = post.username || post.profiles?.username || "Anonymous";
  const slopColor = getSlopColor(post.slop_score);
  const tilt = post.slop_score % 3 === 0 ? "-rotate-[0.5deg]" : post.slop_score % 3 === 1 ? "rotate-[0.5deg]" : "rotate-[0deg]";
  const isLegendary = post.slop_score > 80;

  return (
    <div
      onClick={onClick}
      className={`bg-zinc-900 border rounded-xl p-5 hover:border-zinc-600 transition-all cursor-pointer group ${tilt} hover:rotate-0 ${isLegendary ? "border-yellow-400/60 shadow-yellow-900/20 shadow-lg" : "border-zinc-800"}`}
    >
      {/* Header: username + time + score badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-yellow-400/20 flex items-center justify-center text-xs font-bold text-yellow-300">
            {username[0].toUpperCase()}
          </div>
          <span className="text-sm font-medium text-zinc-300">{username}</span>
        </div>
        <div className="flex items-center gap-2">
          {isLegendary && (
            <span className="text-[10px] font-black uppercase tracking-widest bg-yellow-400 text-zinc-950 px-2 py-0.5 rounded-sm rotate-[1deg]">
              LEGENDARY
            </span>
          )}
          <span className="text-xs text-zinc-500">{timeAgo(post.created_at)}</span>
          {currentUserId === post.user_id && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm("Delete this post?")) onDelete(post.id);
              }}
              className="text-zinc-600 hover:text-red-400 transition-colors text-sm cursor-pointer"
              title="Delete post"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      {post.title && (
        <h2 className="font-black text-base text-white mb-2">{post.title}</h2>
      )}

      {/* Content preview */}
      <p className="text-zinc-200 text-sm leading-relaxed mb-4 line-clamp-4">
        {post.content}
      </p>

      {/* Slop meter */}
      <div className="mb-3">
        <SlopMeter score={post.slop_score} size="sm" />
      </div>

      {/* AI Roast */}
      <div className="mb-4 px-3 py-2 bg-zinc-800/50 rounded-lg border-l-2 border-yellow-400">
        <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400 mb-1">
          CLASSIFIED // AI SLOP JUDGE REPORT
        </p>
        <p className={`text-xs ${slopColor} italic`}>
          &ldquo;{post.roast}&rdquo;
        </p>
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
