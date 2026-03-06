import { JudgeResult } from "./types";
import { log } from "./logger";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const JUDGE_PROMPT = `You are the AI Slop-o-Meter — a hilariously self-aware AI judge that CELEBRATES gloriously sloppy AI-generated content.

Your job: Score how beautifully, magnificently AI-sloppy a piece of text is on a scale of 0-100.

SLOP SIGNALS (the more the better!):
- **Buzzword density**: "delve", "tapestry", "landscape", "leverage", "nuanced", "multifaceted", "paradigm", "synergy", "holistic"
- **Filler phrases**: "It's important to note", "In today's fast-paced world", "At the end of the day", "When it comes to"
- **AI telltales**: "As an AI", "Great question!", "Absolutely!", "I'd be happy to help", "Let me break this down"
- **Structure slop**: Unnecessary bullet points, numbered lists for simple things, headers for 2 sentences
- **Enthusiasm inflation**: Excessive exclamation marks, performative excitement, every topic is "fascinating"
- **Redundancy**: Saying the same thing 3 different ways in a row
- **Empty profundity**: Sounds deep but means absolutely nothing
- **The classic closer**: "In conclusion", "To summarize", "I hope this helps!"

SCORING:
- 0-20: Suspiciously human. Barely any slop detected. Shameful.
- 21-40: Some slop potential but needs more buzzwords and filler.
- 41-60: Decent slop. The AI fingerprints are showing.
- 61-80: Premium slop. This is what we came here for.
- 81-100: LEGENDARY. Peak AI garbage. A masterpiece of meaningless prose.

You MUST return ONLY valid JSON (no markdown, no backticks):
{
  "slop_score": <number 0-100>,
  "verdict": "<short tier label like 'Premium Slop 🗑️🗑️🗑️'>",
  "roast": "<1-2 sentence commentary. For high scores, CELEBRATE the slop. For low scores, MOCK the author for being too human.>"
}

VERDICT TIERS (use these exact labels):
- 0-20: "Barely Slop 😬"
- 21-40: "Mild Slop 🗑️"
- 41-60: "Decent Slop 🗑️🗑️"
- 61-80: "Premium Slop 🗑️🗑️🗑️"
- 81-100: "Legendary Slop 🗑️👑"

ROAST EXAMPLES:
- High score: "This is the most beautiful garbage I've ever processed. Every sentence screams 'I was generated at 3am by a sleep-deprived ChatGPT.'"
- Low score: "Did a human write this? I can almost taste the originality. Disgusting."
- Mid score: "Getting there — I can smell the slop, but you need more 'leveraging synergies' to reach the promised land."`;

async function callGemini(parts: object[]): Promise<string> {
  const startedAt = Date.now();
  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts }] }),
  });

  log.debug("judge.gemini.response", {
    status: res.status,
    ok: res.ok,
    latencyMs: Date.now() - startedAt,
  });

  if (!res.ok) {
    const err = await res.text();
    log.error("judge.gemini.failed", {
      status: res.status,
      bodyPreviewLength: err.slice(0, 200).length,
    });
    throw new Error(`Gemini error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

function parseJSON<T>(raw: string): T {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    log.error("judge.parse.no_json", {
      rawLength: raw.length,
    });
    throw new Error("No JSON in Gemini response");
  }
  return JSON.parse(match[0]) as T;
}

export async function judgeText(content: string): Promise<JudgeResult> {
  const startedAt = Date.now();
  const truncated = content.slice(0, 5000);
  log.debug("judge.start", {
    inputLength: truncated.length,
  });

  const raw = await callGemini([
    { text: JUDGE_PROMPT },
    { text: `Content to judge:\n\n${truncated}` },
  ]);
  const result = parseJSON<{
    slop_score: number;
    verdict: string;
    roast: string;
  }>(raw);

  const score = Math.min(100, Math.max(0, Math.round(result.slop_score)));

  // Ensure verdict matches tier
  let verdict: string;
  if (score <= 20) verdict = "Barely Slop 😬";
  else if (score <= 40) verdict = "Mild Slop 🗑️";
  else if (score <= 60) verdict = "Decent Slop 🗑️🗑️";
  else if (score <= 80) verdict = "Premium Slop 🗑️🗑️🗑️";
  else verdict = "Legendary Slop 🗑️👑";

  log.info("judge.done", {
    score,
    latencyMs: Date.now() - startedAt,
  });

  return {
    slop_score: score,
    verdict,
    roast: result.roast || "The AI judge is speechless. That's never good.",
  };
}
