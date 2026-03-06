"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { log } from "@/lib/logger";
import type { Post, VoteType } from "@/lib/types";
import { useAuth } from "@/app/components/AuthProvider";
import { VoteButtons } from "@/app/components/VoteButtons";
import { ShareButton } from "@/app/components/ShareButton";
import { SignInModal } from "@/app/components/SignInModal";

export function PostDetailClient({ post }: { post: Post }) {
  const [userVote, setUserVote] = useState<VoteType | null>(null);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const router = useRouter();

  const supabase = createClient();

  useEffect(() => {
    let active = true;

    const init = async () => {
      if (!userId) {
        setUserVote(null);
        return;
      }

      const { data: vote, error } = await supabase
        .from("votes")
        .select("vote_type")
        .eq("user_id", userId)
        .eq("post_id", post.id)
        .maybeSingle();

      if (!active) return;

      if (error) {
        log.warn("post_detail.vote_fetch_failed", {
          postId: post.id,
          code: error.code,
          message: error.message,
        });
        return;
      }

      if (vote) {
        setUserVote(vote.vote_type as VoteType);
      }
    };

    void init();

    return () => {
      active = false;
    };
  }, [post.id, supabase, userId]);

  const handleAuthRequired = () => {
    log.info("post_detail.vote_requires_auth", {
      postId: post.id,
      path: window.location.pathname,
    });
    setShowSignInModal(true);
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this post?")) return;
    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    if (res.ok) router.push("/");
  };

  return (
    <>
      {showSignInModal && (
        <SignInModal
          onClose={() => setShowSignInModal(false)}
          redirectTo={`/post/${post.id}`}
        />
      )}
    <div className="flex items-center gap-3 flex-wrap">
      <VoteButtons
        postId={post.id}
        upvotes={post.upvotes}
        downvotes={post.downvotes}
        userVote={userVote}
        isAuthenticated={!!userId}
        onAuthRequired={handleAuthRequired}
      />
      <div className="flex items-center gap-2 ml-auto">
        {userId === post.user_id && (
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-950/50 hover:bg-red-900/60 text-red-400 hover:text-red-300 transition-all border border-red-800/50 cursor-pointer"
          >
            🗑️ Delete
          </button>
        )}
        <ShareButton id={post.id} />
      </div>
    </div>
    </>
  );
}
