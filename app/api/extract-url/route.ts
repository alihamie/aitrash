import { NextRequest, NextResponse } from "next/server";

function stripHtml(html: string): string {
  const decoded = html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));

  return decoded.replace(/<[^>]+>/g, "").trim();
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripHtml(match[1]).trim() : "";
}

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

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "URL must use http or https" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "AISlop/1.0" },
    });

    if (!res.ok) {
      const msg =
        res.status === 403
          ? "This page blocked access (403 Forbidden). Try pasting the text manually."
          : res.status === 404
          ? "Page not found (404)."
          : `Could not fetch page (HTTP ${res.status}).`;
      return NextResponse.json({ error: msg }, { status: res.status });
    }

    const html = await res.text();
    const title = extractTitle(html);

    // Strip script/style blocks before stripping tags
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ");

    const text = stripHtml(cleaned)
      .replace(/\s{3,}/g, "\n\n")
      .trim();

    return NextResponse.json({ text, title });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch page. It may have blocked the request." },
      { status: 500 }
    );
  }
}
