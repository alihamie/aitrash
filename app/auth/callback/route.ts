import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createRequestId, log } from "@/lib/logger";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/";
  const safeNext = (() => {
    try {
      const url = new URL(nextParam, origin)
      return url.origin === origin ? url.pathname + url.search : '/'
    } catch {
      return '/'
    }
  })()
  const requestId = request.headers.get("x-request-id") ?? createRequestId("authcb");

  log.info("auth.callback.received", {
    requestId,
    hasCode: !!code,
    next: safeNext,
  });

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      log.info("auth.callback.exchange_success", {
        requestId,
        redirectTo: `${origin}${safeNext}`,
      });
      return NextResponse.redirect(`${origin}${safeNext}`);
    }

    log.error("auth.callback.exchange_failed", {
      requestId,
      code: error.code,
      message: error.message,
    });
  }

  // Auth code exchange failed — redirect to home with error
  log.warn("auth.callback.redirect_error", {
    requestId,
    redirectTo: `${origin}/?error=auth`,
  });
  return NextResponse.redirect(`${origin}/?error=auth`);
}
