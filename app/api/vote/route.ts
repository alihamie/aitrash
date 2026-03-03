import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import type { VoteType } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { post_id, vote_type } = body as {
      post_id?: string;
      vote_type?: VoteType;
    };

    if (!post_id) {
      return NextResponse.json({ error: "Missing post_id." }, { status: 400 });
    }
    if (!vote_type || !["slop", "clean"].includes(vote_type)) {
      return NextResponse.json(
        { error: 'Invalid vote_type. Must be "slop" or "clean".' },
        { status: 400 }
      );
    }

    // Check auth
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in to vote." },
        { status: 401 }
      );
    }

    // Check for existing vote
    const { data: existingVote } = await supabase
      .from("votes")
      .select("id, vote_type")
      .eq("user_id", user.id)
      .eq("post_id", post_id)
      .maybeSingle();

    if (existingVote) {
      if (existingVote.vote_type === vote_type) {
        // Same vote type — toggle off (remove vote)
        const { error: deleteError } = await supabase
          .from("votes")
          .delete()
          .eq("id", existingVote.id);
        if (deleteError) throw deleteError;

        // Fetch updated post counts
        const { data: post } = await supabase
          .from("posts")
          .select("upvotes, downvotes")
          .eq("id", post_id)
          .single();

        return NextResponse.json({
          success: true,
          action: "removed",
          user_vote: null,
          upvotes: post?.upvotes ?? 0,
          downvotes: post?.downvotes ?? 0,
        });
      } else {
        // Different vote type — switch vote (delete old, insert new)
        const { error: deleteError } = await supabase
          .from("votes")
          .delete()
          .eq("id", existingVote.id);
        if (deleteError) throw deleteError;

        const { error: insertError } = await supabase
          .from("votes")
          .insert({
            user_id: user.id,
            post_id,
            vote_type,
          });
        if (insertError) throw insertError;

        // Fetch updated post counts
        const { data: post } = await supabase
          .from("posts")
          .select("upvotes, downvotes")
          .eq("id", post_id)
          .single();

        return NextResponse.json({
          success: true,
          action: "switched",
          user_vote: vote_type,
          upvotes: post?.upvotes ?? 0,
          downvotes: post?.downvotes ?? 0,
        });
      }
    } else {
      // No existing vote — insert new
      const { error: insertError } = await supabase
        .from("votes")
        .insert({
          user_id: user.id,
          post_id,
          vote_type,
        });
      if (insertError) throw insertError;

      // Fetch updated post counts
      const { data: post } = await supabase
        .from("posts")
        .select("upvotes, downvotes")
        .eq("id", post_id)
        .single();

      return NextResponse.json({
        success: true,
        action: "voted",
        user_vote: vote_type,
        upvotes: post?.upvotes ?? 0,
        downvotes: post?.downvotes ?? 0,
      });
    }
  } catch (err) {
    console.error("/api/vote error:", err);
    return NextResponse.json(
      { error: "Failed to vote. Try again." },
      { status: 500 }
    );
  }
}
