import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabaseServer";
import { log } from "@/lib/logger";

function validateUsername(name: string): string | null {
  if (name.length < 3) return "Username must be at least 3 characters";
  if (name.length > 20) return "Username must be 20 characters or less";
  if (!/^[a-zA-Z0-9_]+$/.test(name)) return "Only letters, numbers, and underscores allowed";
  return null;
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const body = await req.json();
  const trimmed = (body.username ?? "").trim();
  const validationError = validateUsername(trimmed);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const admin = createAdminSupabase();

  // If user already has a profile (e.g. a previous request that was aborted
  // client-side but succeeded server-side), return it directly.
  const { data: existing } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    log.info("create_profile.already_exists", { userId: user.id });
    return NextResponse.json({ profile: existing });
  }

  // Check username uniqueness
  const { data: taken } = await admin
    .from("profiles")
    .select("id")
    .eq("username", trimmed)
    .maybeSingle();

  if (taken) {
    return NextResponse.json(
      { error: "That username is already taken. Try another!" },
      { status: 409 }
    );
  }

  // Create profile
  const { data: profile, error: insertError } = await admin
    .from("profiles")
    .insert({ id: user.id, username: trimmed })
    .select()
    .single();

  if (insertError || !profile) {
    log.error("create_profile.insert_failed", {
      userId: user.id,
      code: insertError?.code,
      message: insertError?.message,
    });
    return NextResponse.json({ error: "Failed to create profile. Try again." }, { status: 500 });
  }

  log.info("create_profile.success", { userId: user.id });
  return NextResponse.json({ profile });
}
