import { ImageResponse } from "next/og";
import { createServerSupabase } from "@/lib/supabaseServer";
import type { Post } from "@/lib/types";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function getPost(id: string): Promise<Post | null> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("posts")
    .select("*, profiles(username)")
    .eq("id", id)
    .single();
  return data as Post | null;
}

function getScoreColor(score: number): string {
  if (score <= 20) return "#71717a";
  if (score <= 40) return "#4ade80";
  if (score <= 60) return "#facc15";
  if (score <= 80) return "#fb923c";
  return "#f59e0b";
}

function getTierLabel(score: number): string {
  if (score <= 20) return "BARELY SLOP";
  if (score <= 40) return "CERTIFIED SLOP";
  if (score <= 60) return "PREMIUM GARBAGE";
  if (score <= 80) return "WEAPONS-GRADE SLOP";
  return "LEGENDARY FILTH";
}

async function loadFont(): Promise<ArrayBuffer> {
  const css = await fetch(
    "https://fonts.googleapis.com/css2?family=Inter:wght@700",
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1",
      },
    }
  ).then((r) => r.text());

  const url = css.match(/src: url\((.+)\) format\('truetype'\)/)?.[1];
  if (!url) throw new Error("Could not parse font URL from Google Fonts CSS");
  return fetch(url).then((r) => r.arrayBuffer());
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [post, fontData] = await Promise.all([getPost(id), loadFont()]);

  if (!post) {
    return new ImageResponse(
      (
        <div
          style={{
            width: 1200,
            height: 630,
            background: "#09090b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <div style={{ fontSize: 64, color: "#f59e0b" }}>AI TRASH</div>
          <div style={{ fontSize: 24, color: "#52525b", marginTop: 16 }}>
            Post not found
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [{ name: "Inter", data: fontData, weight: 700 }],
      }
    );
  }

  const username =
    post.profiles?.username || post.username || "Anonymous";
  const scoreColor = getScoreColor(post.slop_score);
  const tierLabel = getTierLabel(post.slop_score);

  const displayText = post.title
    ? post.title.slice(0, 80) + (post.title.length > 80 ? "..." : "")
    : post.content.slice(0, 80) + (post.content.length > 80 ? "..." : "");

  const roastText =
    post.roast.slice(0, 180) + (post.roast.length > 180 ? "..." : "");

  const filledBars = Math.round((post.slop_score / 100) * 20);

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "#09090b",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Inter",
        }}
      >
        {/* Top amber bar */}
        <div style={{ width: "100%", height: 6, background: "#f59e0b" }} />

        {/* Main content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "row",
            padding: "48px 56px",
            gap: 48,
          }}
        >
          {/* Left column */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {/* Brand */}
            <div style={{ color: "#f59e0b", fontSize: 22, fontWeight: 700, letterSpacing: 2 }}>
              AI TRASH
            </div>

            {/* Post text */}
            <div
              style={{
                color: "#e4e4e7",
                fontSize: 28,
                fontWeight: 600,
                lineHeight: 1.4,
                marginTop: 24,
                flex: 1,
              }}
            >
              {displayText}
            </div>

            {/* Score + tier */}
            <div style={{ marginTop: 32, display: "flex", flexDirection: "column" }}>
              <div style={{ color: scoreColor, fontSize: 72, fontWeight: 900, lineHeight: 1 }}>
                {`${post.slop_score}%`}
              </div>
              <div style={{ color: scoreColor, fontSize: 18, fontWeight: 700, marginTop: 6, letterSpacing: 1 }}>
                {tierLabel}
              </div>

              {/* Progress bar */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: 4,
                  marginTop: 12,
                }}
              >
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 22,
                      height: 10,
                      borderRadius: 3,
                      background: i < filledBars ? scoreColor : "#27272a",
                    }}
                  />
                ))}
              </div>

              {/* Author */}
              <div style={{ color: "#52525b", fontSize: 16, marginTop: 16 }}>
                {`@${username}`}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 1, background: "#27272a" }} />

          {/* Right column */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              paddingLeft: 8,
            }}
          >
            <div style={{ color: "#f59e0b", fontSize: 14, fontWeight: 700, letterSpacing: 2, marginBottom: 20 }}>
              AI SLOP JUDGE
            </div>
            <div
              style={{
                color: "#e4e4e7",
                fontSize: 26,
                lineHeight: 1.55,
                fontStyle: "italic",
              }}
            >
              {`\u201c${roastText}\u201d`}
            </div>
          </div>
        </div>

        {/* Bottom hazard stripe */}
        <div style={{ display: "flex", flexDirection: "row", height: 12 }}>
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                background: i % 2 === 0 ? "#f59e0b" : "#09090b",
              }}
            />
          ))}
        </div>
      </div>
    ),
      {
        width: 1200,
        height: 630,
        fonts: [{ name: "Inter", data: fontData, weight: 700 }],
      }
  );
}
