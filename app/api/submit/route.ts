import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';
import { judgeText, judgeImage } from '@/lib/judge';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const content = formData.get('content') as string | null;
    const image = formData.get('image') as File | null;
    const category = formData.get('category') as string;

    if (!category) return NextResponse.json({ error: 'Category required.' }, { status: 400 });
    if (!content?.trim() && !image) return NextResponse.json({ error: 'Content or image required.' }, { status: 400 });
    if (content?.trim() && image) return NextResponse.json({ error: 'Submit text or image, not both.' }, { status: 400 });

    const db = getServerSupabase();
    let judged;
    let imageUrl: string | null = null;

    if (image) {
      if (image.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Image must be under 5MB.' }, { status: 400 });
      const buffer = Buffer.from(await image.arrayBuffer());
      const base64 = buffer.toString('base64');
      try {
        judged = await judgeImage(base64, image.type);
      } catch (e: unknown) {
        if (e instanceof Error && e.message === 'NSFW_REJECTED') {
          return NextResponse.json({ error: 'NSFW content detected. Rejected.' }, { status: 400 });
        }
        throw e;
      }
      // Store image in Supabase Storage
      const ext = image.name.split('.').pop() ?? 'jpg';
      const path = `${Date.now()}.${ext}`;
      const { error: uploadError } = await db.storage.from('images').upload(path, buffer, { contentType: image.type });
      if (!uploadError) {
        const { data } = db.storage.from('images').getPublicUrl(path);
        imageUrl = data.publicUrl;
      }
    } else {
      judged = await judgeText(content!.trim());
    }

    const { data, error } = await db
      .from('posts')
      .insert({
        content: content?.trim() ?? null,
        image_url: imageUrl,
        category,
        ai_rating: judged!.rating,
        ai_verdict: judged!.verdict,
        source: 'web',
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, id: data.id });
  } catch (err) {
    console.error('/api/submit error:', err);
    return NextResponse.json({ error: 'Failed to submit. Try again.' }, { status: 500 });
  }
}
