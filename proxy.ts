import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createRequestId, log } from "@/lib/logger";

export async function proxy(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? createRequestId("proxy");
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the auth session — important for server components
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    const payload = {
      requestId,
      path: request.nextUrl.pathname,
      code: error.code,
      message: error.message,
    };

    if (error.message === "Auth session missing!") {
      log.debug("proxy.session_refresh_missing", payload);
    } else {
      log.warn("proxy.session_refresh_failed", payload);
    }
  } else {
    log.debug("proxy.session_refresh_ok", {
      requestId,
      path: request.nextUrl.pathname,
      hasUser: !!user,
    });
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
