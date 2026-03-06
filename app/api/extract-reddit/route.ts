import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const validHosts = ["reddit.com", "www.reddit.com"];
  if (!validHosts.includes(parsed.hostname) || !parsed.pathname.includes("/comments/")) {
    return NextResponse.json(
      { error: "URL must be a Reddit post (reddit.com with /comments/ in path)" },
      { status: 400 }
    );
  }

  // Normalize: strip trailing slash, append .json
  const normalized = parsed.pathname.replace(/\/$/, "") + ".json";
  const jsonUrl = `https://www.reddit.com${normalized}`;

  try {
    const res = await fetch(jsonUrl, {
      headers: { "User-Agent": "AISlop/1.0" },
    });

    if (!res.ok) {
      const msg =
        res.status === 403
          ? "This Reddit post is private or restricted."
          : res.status === 404
          ? "Reddit post not found or deleted."
          : "Could not fetch Reddit post.";
      return NextResponse.json({ error: msg }, { status: res.status });
    }

    const data = await res.json();
    const post = data?.[0]?.data?.children?.[0]?.data;

    if (!post) {
      return NextResponse.json({ error: "Could not parse Reddit post." }, { status: 500 });
    }

    const title: string = post.title ?? "";
    const selftext: string = post.selftext ?? "";
    const author: string = post.author ?? "";

    const text = selftext.trim() ? `${title}\n\n${selftext}` : title;

    return NextResponse.json({ text, author: `u/${author}` });
  } catch {
    return NextResponse.json({ error: "Failed to fetch Reddit post." }, { status: 500 });
  }
}
