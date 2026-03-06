import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { log } from "./logger";

/**
 * Server client with auth context from cookies.
 * Use this for authenticated operations (submit, vote, profile).
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (error) {
            log.warn("supabase.server.cookies.set_failed", {
              cookieCount: cookiesToSet.length,
              message: error instanceof Error ? error.message : "Unknown",
            });
            // Called from Server Component — ignore
          }
        },
      },
    }
  );
}

/**
 * Admin client with service role key.
 * Use for elevated operations (AI judge writes, bypassing RLS).
 */
export function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
