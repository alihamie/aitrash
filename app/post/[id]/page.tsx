import { notFound } from "next/navigation";
import { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabaseServer";
import type { Post } from "@/lib/types";
import { getSlopColor, getSlopTier, timeAgo } from "@/lib/types";
import Link from "next/link";
import { PostDetailClient } from "./PostDetailClient";

async function getPost(id: string): Promise<Post | null> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("posts")
    .select("*, profiles(username)")
    .eq("id", id)
    .single();
  return data as Post | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) return { title: "Post not found — AI Trash" };

  const tier = getSlopTier(post.slop_score);
  const title = post.content
    ? `${post.content.slice(0, 60)}${post.content.length > 60 ? "..." : ""} — ${post.slop_score}% Slop`
    : `AI Trash — ${tier}`;

  return {
    title: `${title} — AI Trash`,
    description: post.roast,
    openGraph: {
      title,
      description: post.roast,
      type: "article",
    },
    twitter: {
      card: "summary",
      title,
      description: post.roast,
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) notFound();

  const username = post.profiles?.username || "Anonymous";
  const slopColor = getSlopColor(post.slop_score);

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/"
        className="text-zinc-500 hover:text-zinc-300 text-sm mb-6 inline-flex items-center gap-1 transition-colors"
      >
        ← Back to feed
      </Link>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mt-4">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
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
          <span className="text-xs text-zinc-600">
            {new Date(post.created_at).toLocaleDateString()}
          </span>
        </div>

        {/* Content */}
        <div className="p-5">
          <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap mb-6">
            {post.content}
          </p>

          {/* Slop Meter - rendered on server */}
          <div className="mb-6">
            <div className="w-full">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-4xl text-white">
                  {post.slop_score}%
                </span>
                <span className="text-base font-medium text-zinc-300">
                  {getSlopTier(post.slop_score)}
                </span>
              </div>
              <div className="w-full h-4 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-4 bg-gradient-to-r ${
                    post.slop_score <= 20
                      ? "from-zinc-600 to-zinc-400"
                      : post.slop_score <= 40
                        ? "from-green-600 to-green-400"
                        : post.slop_score <= 60
                          ? "from-yellow-600 to-yellow-400"
                          : post.slop_score <= 80
                            ? "from-orange-600 to-orange-400"
                            : "from-purple-600 to-fuchsia-400"
                  } rounded-full`}
                  style={{ width: `${post.slop_score}%` }}
                />
              </div>
            </div>
          </div>

          {/* AI Roast */}
          <div className="bg-purple-950/30 border border-purple-800/50 rounded-xl p-4 mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-1">
              🤖 AI Slop Judge
            </p>
            <p className={`${slopColor} font-semibold italic text-lg`}>
              &ldquo;{post.roast}&rdquo;
            </p>
          </div>

          {/* Client-side interactive buttons */}
          <PostDetailClient post={post} />
        </div>
      </div>
    </div>
  );
}
