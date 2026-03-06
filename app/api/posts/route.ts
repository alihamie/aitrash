import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import type { Post } from "@/lib/types";

const PAGE_SIZE = 25;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const sort = searchParams.get("sort") ?? "hot";
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  const supabase = await createServerSupabase();

  let posts: Post[] = [];

  if (sort === "hot") {
    const { data, error } = await supabase.rpc("get_hot_posts", {
      p_limit: PAGE_SIZE,
      p_offset: offset,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    posts = (data as Post[]) ?? [];
  } else {
    let query = supabase
      .from("posts")
      .select("*, profiles(username)")
      .range(offset, offset + PAGE_SIZE - 1);

    if (sort === "fresh") {
      query = query.order("created_at", { ascending: false });
    } else if (sort === "most_slopped") {
      query = query
        .order("upvotes", { ascending: false })
        .order("created_at", { ascending: false });
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    posts = (data as Post[]) ?? [];
  }

  return NextResponse.json({ posts });
}
