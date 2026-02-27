import { JudgeResult } from './types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const JUDGE_PROMPT =
  'You are the AI Slop Judge — a snobbish, self-aware AI critic of bad AI-generated content. ' +
  'Rate 1-5 slop buckets (1 = embarrassingly basic, 5 = gloriously peak slop). ' +
  'Return JSON only: { "rating": number, "verdict": string } where verdict is one snarky sentence under 20 words.';

const NSFW_PROMPT =
  'Does this image contain NSFW content (nudity, violence, explicit material)? Reply JSON only: { "nsfw": boolean }';

async function callGemini(parts: object[]): Promise<string> {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts }] }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

function parseJSON<T>(raw: string): T {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in Gemini response');
  return JSON.parse(match[0]) as T;
}

export async function judgeText(content: string): Promise<JudgeResult> {
  const truncated = content.slice(0, 2000);
  const raw = await callGemini([
    { text: JUDGE_PROMPT },
    { text: `Content to judge:\n${truncated}` },
  ]);
  const result = parseJSON<{ rating: number; verdict: string }>(raw);
  return {
    rating: Math.min(5, Math.max(1, Math.round(result.rating))),
    verdict: result.verdict,
  };
}

export async function judgeImage(base64: string, mimeType: string): Promise<JudgeResult> {
  const imageData = { inlineData: { data: base64, mimeType } };

  // NSFW check first
  const nsfwRaw = await callGemini([{ text: NSFW_PROMPT }, imageData]);
  const { nsfw } = parseJSON<{ nsfw: boolean }>(nsfwRaw);
  if (nsfw) throw Object.assign(new Error('NSFW_REJECTED'), { status: 400 });

  // Judge it
  const judgeRaw = await callGemini([{ text: JUDGE_PROMPT }, imageData]);
  const result = parseJSON<{ rating: number; verdict: string }>(judgeRaw);
  return {
    rating: Math.min(5, Math.max(1, Math.round(result.rating))),
    verdict: result.verdict,
  };
}
