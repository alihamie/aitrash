"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import type { Post, VoteType } from "@/lib/types";
import { VoteButtons } from "@/app/components/VoteButtons";
import { ShareButton } from "@/app/components/ShareButton";

export function PostDetailClient({ post }: { post: Post }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [userVote, setUserVote] = useState<VoteType | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: vote } = await supabase
          .from("votes")
          .select("vote_type")
          .eq("user_id", user.id)
          .eq("post_id", post.id)
          .maybeSingle();
        if (vote) {
          setUserVote(vote.vote_type as VoteType);
        }
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  const handleAuthRequired = () => {
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/post/${post.id}`,
      },
    });
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <VoteButtons
        postId={post.id}
        upvotes={post.upvotes}
        downvotes={post.downvotes}
        userVote={userVote}
        isAuthenticated={!!userId}
        onAuthRequired={handleAuthRequired}
      />
      <div className="ml-auto">
        <ShareButton id={post.id} />
      </div>
    </div>
  );
}
