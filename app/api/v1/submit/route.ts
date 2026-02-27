import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getServerSupabase } from '@/lib/supabaseServer';
import { judgeText, judgeImage } from '@/lib/judge';

async function checkRateLimit(db: ReturnType<typeof getServerSupabase>, keyHash: string): Promise<{ allowed: boolean; reason?: string }> {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Hourly check
  const { data: hourlyRows } = await db
    .from('rate_limits')
    .select('request_count')
    .eq('key_hash', keyHash)
    .gte('window_start', hourAgo.toISOString());

  const hourlyCount = (hourlyRows ?? []).reduce((s, r) => s + r.request_count, 0);
  if (hourlyCount >= 10) return { allowed: false, reason: 'Hourly limit (10 req/hr) exceeded.' };

  // Daily check
  const { data: dailyRows } = await db
    .from('rate_limits')
    .select('request_count')
    .eq('key_hash', keyHash)
    .gte('window_start', dayAgo.toISOString());

  const dailyCount = (dailyRows ?? []).reduce((s, r) => s + r.request_count, 0);
  if (dailyCount >= 50) return { allowed: false, reason: 'Daily limit (50 req/day) exceeded.' };

  // Upsert counter for current hour window
  const windowStart = new Date(Math.floor(now.getTime() / (60 * 60 * 1000)) * 60 * 60 * 1000).toISOString();
  const { data: existing } = await db
    .from('rate_limits')
    .select('id, request_count')
    .eq('key_hash', keyHash)
    .eq('window_start', windowStart)
    .single();

  if (existing) {
    await db.from('rate_limits').update({ request_count: existing.request_count + 1 }).eq('id', existing.id);
  } else {
    await db.from('rate_limits').insert({ key_hash: keyHash, window_start: windowStart, request_count: 1 });
  }

  return { allowed: true };
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) return NextResponse.json({ error: 'Missing x-api-key header.' }, { status: 401 });

    const keyHash = createHash('sha256').update(apiKey).digest('hex');
    const db = getServerSupabase();

    const { data: keyRow } = await db.from('api_keys').select('id').eq('key_hash', keyHash).single();
    if (!keyRow) return NextResponse.json({ error: 'Invalid API key.' }, { status: 401 });

    const rateCheck = await checkRateLimit(db, keyHash);
    if (!rateCheck.allowed) return NextResponse.json({ error: rateCheck.reason }, { status: 429 });

    const body = await req.json();
    const { content, image_base64, category } = body;

    if (!category) return NextResponse.json({ error: 'Category required.' }, { status: 400 });
    if (!content && !image_base64) return NextResponse.json({ error: 'content or image_base64 required.' }, { status: 400 });

    let judged;
    let imageUrl: string | null = null;

    if (image_base64) {
      const mimeType = body.mime_type ?? 'image/jpeg';
      try {
        judged = await judgeImage(image_base64, mimeType);
      } catch (e: unknown) {
        if (e instanceof Error && e.message === 'NSFW_REJECTED') {
          return NextResponse.json({ error: 'NSFW content detected. Rejected.' }, { status: 400 });
        }
        throw e;
      }
      // Store in Supabase Storage
      const buffer = Buffer.from(image_base64, 'base64');
      const ext = mimeType.split('/')[1] ?? 'jpg';
      const path = `${Date.now()}.${ext}`;
      const { error: uploadError } = await db.storage.from('images').upload(path, buffer, { contentType: mimeType });
      if (!uploadError) {
        const { data } = db.storage.from('images').getPublicUrl(path);
        imageUrl = data.publicUrl;
      }
    } else {
      judged = await judgeText(content);
    }

    const { data, error } = await db
      .from('posts')
      .insert({
        content: content ?? null,
        image_url: imageUrl,
        category,
        ai_rating: judged!.rating,
        ai_verdict: judged!.verdict,
        source: 'api',
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, id: data.id, rating: judged!.rating, verdict: judged!.verdict });
  } catch (err) {
    console.error('/api/v1/submit error:', err);
    return NextResponse.json({ error: 'Failed to submit.' }, { status: 500 });
  }
}
