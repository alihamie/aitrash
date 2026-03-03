// ============================================================
// Types for AI Trash
// ============================================================

export type SlopTier =
  | "Barely Slop 😬"
  | "Mild Slop 🗑️"
  | "Decent Slop 🗑️🗑️"
  | "Premium Slop 🗑️🗑️🗑️"
  | "Legendary Slop 🗑️👑";

export type VoteType = "slop" | "clean";

export type FeedSort = "hot" | "fresh" | "most_slopped";

export interface Profile {
  id: string;
  username: string;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  slop_score: number;
  verdict: string;
  roast: string;
  upvotes: number;
  downvotes: number;
  created_at: string;
  // Joined from profiles
  profiles?: {
    username: string;
  };
  // Computed (from RPC)
  username?: string;
  hot_score?: number;
}

export interface Vote {
  id: string;
  user_id: string;
  post_id: string;
  vote_type: VoteType;
  created_at: string;
}

export interface JudgeResult {
  slop_score: number;
  verdict: string;
  roast: string;
}

export function getSlopTier(score: number): SlopTier {
  if (score <= 20) return "Barely Slop 😬";
  if (score <= 40) return "Mild Slop 🗑️";
  if (score <= 60) return "Decent Slop 🗑️🗑️";
  if (score <= 80) return "Premium Slop 🗑️🗑️🗑️";
  return "Legendary Slop 🗑️👑";
}

export function getSlopColor(score: number): string {
  if (score <= 20) return "text-zinc-400";
  if (score <= 40) return "text-green-400";
  if (score <= 60) return "text-yellow-400";
  if (score <= 80) return "text-orange-400";
  return "text-purple-400";
}

export function getSlopBgColor(score: number): string {
  if (score <= 20) return "bg-zinc-400";
  if (score <= 40) return "bg-green-400";
  if (score <= 60) return "bg-yellow-400";
  if (score <= 80) return "bg-orange-400";
  return "bg-purple-400";
}

export function getSlopGradient(score: number): string {
  if (score <= 20) return "from-zinc-600 to-zinc-400";
  if (score <= 40) return "from-green-600 to-green-400";
  if (score <= 60) return "from-yellow-600 to-yellow-400";
  if (score <= 80) return "from-orange-600 to-orange-400";
  return "from-purple-600 to-fuchsia-400";
}

export function timeAgo(date: string): string {
  const seconds = Math.floor(
    (new Date().getTime() - new Date(date).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
