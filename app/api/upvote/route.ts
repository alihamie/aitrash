import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });

    const db = getServerSupabase();
    const { data: post } = await db.from('posts').select('human_upvotes').eq('id', id).single();
    if (!post) return NextResponse.json({ error: 'Post not found.' }, { status: 404 });

    const { error } = await db
      .from('posts')
      .update({ human_upvotes: post.human_upvotes + 1 })
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true, upvotes: post.human_upvotes + 1 });
  } catch (err) {
    console.error('upvote error:', err);
    return NextResponse.json({ error: 'Failed to upvote.' }, { status: 500 });
  }
}
