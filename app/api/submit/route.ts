import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabaseServer";
import { judgeText } from "@/lib/judge";
import { createRequestId, log } from "@/lib/logger";

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY!;
const MAX_POSTS_PER_DAY = 3;

async function verifyTurnstile(token: string) {
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
    return {
      ok: data.success === true,
      status: res.status,
      errorCodes: (data["error-codes"] as string[] | undefined) ?? [],
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      errorCodes: ["turnstile_network_error"],
      message: error instanceof Error ? error.message : "Unknown",
    };
  }
}

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? createRequestId("submit");
  const startedAt = Date.now();

  const fail = (status: number, code: string, error: string, details?: Record<string, unknown>) => {
    log.warn("submit.api.failed", {
      requestId,
      status,
      code,
      ...details,
    });

    return NextResponse.json(
      { code, error, requestId },
      { status }
    );
  };

  try {
    const body = await req.json();
    const { content, title, turnstileToken } = body;

    log.info("submit.api.start", {
      requestId,
      contentLength: typeof content === "string" ? content.length : 0,
      hasTurnstileToken: !!turnstileToken,
    });

    // 1. Verify Turnstile (skip on localhost in dev)
    const isDev = process.env.NODE_ENV === "development";
    if (!turnstileToken) {
      return fail(400, "TURNSTILE_REQUIRED", "Bot verification required.");
    }
    if (turnstileToken !== "localhost-bypass" || !isDev) {
      const turnstileResult = await verifyTurnstile(turnstileToken);
      if (!turnstileResult.ok) {
        return fail(403, "TURNSTILE_FAILED", "Bot verification failed. Try again.", {
          turnstileStatus: turnstileResult.status,
          turnstileErrors: turnstileResult.errorCodes,
          turnstileMessage: turnstileResult.message,
        });
      }
    }
    log.debug("submit.api.turnstile_ok", { requestId, isDevBypass: turnstileToken === "localhost-bypass" && isDev });

    // 2. Check auth
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return fail(401, "AUTH_LOOKUP_FAILED", "Failed to verify session.", {
        authCode: authError.code,
        authMessage: authError.message,
      });
    }

    if (!user) {
      return fail(401, "AUTH_REQUIRED", "You must be signed in to dump slop.");
    }
    log.debug("submit.api.auth_ok", { requestId, userId: user.id });

    // 3. Validate content
    const trimmed = content?.trim();
    if (!trimmed || trimmed.length < 1) {
      return fail(400, "CONTENT_REQUIRED", "Content is required.");
    }
    if (trimmed.length > 5000) {
      return fail(400, "CONTENT_TOO_LONG", "Content must be under 5000 characters.");
    }

    // 3b. Validate title (optional)
    const trimmedTitle = typeof title === "string" ? title.trim() : undefined;
    if (trimmedTitle !== undefined && trimmedTitle.length > 100) {
      return fail(400, "TITLE_TOO_LONG", "Title must be under 100 characters.");
    }

    // 4. Rate limit: 3 posts per 24 hours
    const admin = createAdminSupabase();

    // 4a. Check user has a profile (required for FK constraint)
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return fail(500, "PROFILE_LOOKUP_FAILED", "Failed to verify username setup.", {
        profileCode: profileError.code,
        profileMessage: profileError.message,
      });
    }

    if (!profile) {
      return fail(
        400,
        "PROFILE_REQUIRED",
        "Please set a username first (click your avatar in the top right)."
      );
    }

    const { data: countData, error: rateError } = await admin.rpc("get_user_post_count_today", {
      p_user_id: user.id,
    });

    if (rateError) {
      return fail(500, "RATE_LIMIT_LOOKUP_FAILED", "Failed to check posting limits.", {
        rateCode: rateError.code,
        rateMessage: rateError.message,
      });
    }

    const postCount = countData ?? 0;
    if (postCount >= MAX_POSTS_PER_DAY) {
      return fail(
        429,
        "RATE_LIMIT_REACHED",
        `You've hit your daily limit of ${MAX_POSTS_PER_DAY} slop dumps. Come back tomorrow!`,
        { postCount }
      );
    }
    log.debug("submit.api.rate_ok", { requestId, postCount });

    // 5. AI Judge
    const judged = await judgeText(trimmed);
    log.debug("submit.api.judge_ok", { requestId, score: judged.slop_score });

    // 6. Insert post (using admin to bypass RLS since we already verified auth)
    const { data, error } = await admin
      .from("posts")
      .insert({
        user_id: user.id,
        title: trimmedTitle || null,
        content: trimmed,
        slop_score: judged.slop_score,
        verdict: judged.verdict,
        roast: judged.roast,
      })
      .select()
      .single();

    if (error) {
      return fail(500, "POST_INSERT_FAILED", "Failed to save your slop. Try again.", {
        insertCode: error.code,
        insertMessage: error.message,
      });
    }

    log.info("submit.api.success", {
      requestId,
      postId: data.id,
      score: judged.slop_score,
      latencyMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      success: true,
      code: "OK",
      requestId,
      id: data.id,
      slop_score: judged.slop_score,
      verdict: judged.verdict,
      roast: judged.roast,
      remaining: MAX_POSTS_PER_DAY - postCount - 1,
    });
  } catch (err) {
    log.error("submit.api.exception", {
      requestId,
      message: err instanceof Error ? err.message : "Unknown",
      latencyMs: Date.now() - startedAt,
    });
    return NextResponse.json({
      code: "SUBMIT_INTERNAL_ERROR",
      requestId,
      error: "Failed to submit. Try again.",
    }, { status: 500 });
  }
}
