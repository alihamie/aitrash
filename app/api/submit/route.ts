import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabaseServer";
import { judgeText } from "@/lib/judge";

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY!;
const MAX_POSTS_PER_DAY = 3;

async function verifyTurnstile(token: string): Promise<boolean> {
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: TURNSTILE_SECRET,
          response: token,
        }),
      }
    );
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, turnstileToken } = body;

    // 1. Verify Turnstile (skip on localhost in dev)
    const isDev = process.env.NODE_ENV === "development";
    if (!turnstileToken) {
      return NextResponse.json(
        { error: "Bot verification required." },
        { status: 400 }
      );
    }
    if (turnstileToken !== "localhost-bypass" || !isDev) {
      const turnstileOk = await verifyTurnstile(turnstileToken);
      if (!turnstileOk) {
        return NextResponse.json(
          { error: "Bot verification failed. Try again." },
          { status: 403 }
        );
      }
    }

    // 2. Check auth
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in to dump slop." },
        { status: 401 }
      );
    }

    // 3. Validate content
    const trimmed = content?.trim();
    if (!trimmed || trimmed.length < 1) {
      return NextResponse.json(
        { error: "Content is required." },
        { status: 400 }
      );
    }
    if (trimmed.length > 5000) {
      return NextResponse.json(
        { error: "Content must be under 5000 characters." },
        { status: 400 }
      );
    }

    // 4. Rate limit: 3 posts per 24 hours
    const admin = createAdminSupabase();

    // 4a. Check user has a profile (required for FK constraint)
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json(
        { error: "Please set a username first (click your avatar in the top right)." },
        { status: 400 }
      );
    }

    const { data: countData } = await admin.rpc("get_user_post_count_today", {
      p_user_id: user.id,
    });
    const postCount = countData ?? 0;
    if (postCount >= MAX_POSTS_PER_DAY) {
      return NextResponse.json(
        {
          error: `You've hit your daily limit of ${MAX_POSTS_PER_DAY} slop dumps. Come back tomorrow!`,
        },
        { status: 429 }
      );
    }

    // 5. AI Judge
    const judged = await judgeText(trimmed);

    // 6. Insert post (using admin to bypass RLS since we already verified auth)
    const { data, error } = await admin
      .from("posts")
      .insert({
        user_id: user.id,
        content: trimmed,
        slop_score: judged.slop_score,
        verdict: judged.verdict,
        roast: judged.roast,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      id: data.id,
      slop_score: judged.slop_score,
      verdict: judged.verdict,
      roast: judged.roast,
      remaining: MAX_POSTS_PER_DAY - postCount - 1,
    });
  } catch (err) {
    console.error("/api/submit error:", err);
    return NextResponse.json(
      { error: "Failed to submit. Try again." },
      { status: 500 }
    );
  }
}
