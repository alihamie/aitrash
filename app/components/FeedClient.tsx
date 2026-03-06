"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { log } from "@/lib/logger";
import type { Post, FeedSort, VoteType } from "@/lib/types";
import { useAuth } from "./AuthProvider";
import { PostCard } from "./PostCard";
import { PostModal } from "./PostModal";
import { SignInModal } from "./SignInModal";

const PAGE_SIZE = 25;

const TABS: { key: FeedSort; label: string; icon: string }[] = [
  { key: "hot", label: "Hot Garbage", icon: "🔥" },
  { key: "fresh", label: "Fresh Filth", icon: "🆕" },
  { key: "most_slopped", label: "Hall of Shame", icon: "👑" },
];

interface FeedClientProps {
  initialPosts: Post[];
  initialSort: FeedSort;
}

export default function FeedClient({
  initialPosts,
  initialSort,
}: FeedClientProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [sort, setSort] = useState<FeedSort>(initialSort);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length >= PAGE_SIZE);
  const [selected, setSelected] = useState<Post | null>(null);
  const [userVotes, setUserVotes] = useState<Record<string, VoteType>>({});
  const [showSignInModal, setShowSignInModal] = useState(false);
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const supabase = createClient();

  // Fetch user's votes for visible posts when auth state changes
  useEffect(() => {
    let active = true;

    const initVotes = async () => {
      if (!userId) {
        setUserVotes({});
        return;
      }

      const postIds = initialPosts.map((p) => p.id);
      if (postIds.length === 0) {
        return;
      }

      const { data: votes, error } = await supabase
        .from("votes")
        .select("post_id, vote_type")
        .eq("user_id", userId)
        .in("post_id", postIds);

      if (!active) return;

      if (error) {
        log.warn("feed.init_votes_failed", {
          code: error.code,
          message: error.message,
          postCount: postIds.length,
        });
        return;
      }

      if (votes) {
        const voteMap: Record<string, VoteType> = {};
        votes.forEach((v: { post_id: string; vote_type: string }) => {
          voteMap[v.post_id] = v.vote_type as VoteType;
        });
        setUserVotes(voteMap);
        log.debug("feed.init_votes_done", {
          voteCount: votes.length,
        });
      }
    };

    void initVotes();

    return () => {
      active = false;
    };
  }, [initialPosts, supabase, userId]);

  const fetchPosts = useCallback(
    async (feedSort: FeedSort, offset: number = 0) => {
      const res = await fetch(`/api/posts?sort=${feedSort}&offset=${offset}`);
      if (!res.ok) return [];
      const json = await res.json();
      return (json.posts as Post[]) ?? [];
    },
    []
  );

  const fetchUserVotes = useCallback(
    async (postIds: string[]) => {
      if (!userId || postIds.length === 0) return;
      const { data: votes } = await supabase
        .from("votes")
        .select("post_id, vote_type")
        .eq("user_id", userId)
        .in("post_id", postIds);
      if (votes) {
        setUserVotes((prev) => {
          const updated = { ...prev };
          votes.forEach((v: { post_id: string; vote_type: string }) => {
            updated[v.post_id] = v.vote_type as VoteType;
          });
          return updated;
        });
      }
    },
    [userId, supabase]
  );

  const handleTabChange = async (newSort: FeedSort) => {
    if (newSort === sort) return;
    setSort(newSort);
    setLoading(true);
    const data = await fetchPosts(newSort);
    setPosts(data);
    setHasMore(data.length >= PAGE_SIZE);
    await fetchUserVotes(data.map((p) => p.id));
    setLoading(false);
  };

  const handleLoadMore = async () => {
    setLoading(true);
    const data = await fetchPosts(sort, posts.length);
    setPosts((prev) => [...prev, ...data]);
    setHasMore(data.length >= PAGE_SIZE);
    await fetchUserVotes(data.map((p) => p.id));
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
      if (selected?.id === id) setSelected(null);
    }
  };

  const handleAuthRequired = () => {
    log.info("feed.vote_requires_auth", {
      path: window.location.pathname,
    });
    setShowSignInModal(true);
  };

  return (
    <div>
      {showSignInModal && (
        <SignInModal onClose={() => setShowSignInModal(false)} />
      )}
      {/* Sort tabs */}
      <div className="flex gap-1 mb-6 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              sort === tab.key
                ? "bg-zinc-700 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Posts */}
      {loading && posts.length === 0 ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 animate-pulse"
            >
              <div className="h-4 bg-zinc-800 rounded w-1/3 mb-3" />
              <div className="h-3 bg-zinc-800 rounded w-full mb-2" />
              <div className="h-3 bg-zinc-800 rounded w-2/3 mb-4" />
              <div className="h-2 bg-zinc-800 rounded w-full mb-3" />
              <div className="h-8 bg-zinc-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🗑️</div>
          <h3 className="text-xl font-black text-zinc-300 mb-2 uppercase tracking-wide">
            Nobody Has Dumped Anything Yet
          </h3>
          <p className="text-zinc-500">
            Be the first disgrace. We believe in you.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              userVote={userVotes[post.id] ?? null}
              isAuthenticated={!!userId}
              onAuthRequired={handleAuthRequired}
              onClick={() => setSelected(post)}
              currentUserId={userId}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && posts.length > 0 && (
        <div className="text-center mt-8">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-medium transition-colors disabled:opacity-50 cursor-pointer border border-zinc-700"
          >
            {loading ? "Loading..." : "Load More Slop 🗑️"}
          </button>
        </div>
      )}

      {/* Modal */}
      {selected && (
        <PostModal
          post={selected}
          userVote={userVotes[selected.id] ?? null}
          isAuthenticated={!!userId}
          onAuthRequired={handleAuthRequired}
          onClose={() => setSelected(null)}
          currentUserId={userId}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
