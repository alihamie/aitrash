import { createServerSupabase } from "@/lib/supabaseServer";
import type { Post } from "@/lib/types";
import FeedClient from "./components/FeedClient";
import Link from "next/link";

export const revalidate = 0;

export default async function FeedPage() {
  const supabase = await createServerSupabase();

  // Default feed: hot posts via RPC
  const { data: posts, error } = await supabase.rpc("get_hot_posts", {
    p_limit: 25,
    p_offset: 0,
  });

  if (error) {
    return (
      <div className="text-center py-20 text-zinc-500">
        <p className="text-4xl mb-4">💀</p>
        <p>Failed to load slop. The dumpster is on fire.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-black tracking-tighter mb-2">
          The Slop <span className="text-yellow-400">Feed</span> 🗑️
        </h1>
        <p className="text-zinc-400 text-sm">
          AI-generated garbage, celebrated by the community. The sloppier, the
          better.
        </p>
      </div>

      {!posts || posts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-6xl mb-6">🗑️</p>
          <h2 className="text-2xl font-black text-zinc-200 mb-2">
            The dumpster is empty!
          </h2>
          <p className="text-zinc-400 text-sm mb-8">
            No one has dumped any AI slop yet. Be the brave pioneer.
          </p>
          <Link
            href="/submit"
            className="inline-block bg-yellow-400 text-zinc-950 font-bold px-8 py-4 rounded-xl hover:bg-yellow-300 transition-colors text-lg"
          >
            Dump the first slop 🗑️
          </Link>
        </div>
      ) : (
        <FeedClient initialPosts={posts as Post[]} initialSort="hot" />
      )}
    </div>
  );
}
