import { supabase } from '@/lib/supabase';
import { Post } from '@/lib/types';
import FeedClient from './components/FeedClient';
import Link from 'next/link';

export const revalidate = 0;

export default async function FeedPage() {
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return (
      <div className="text-center py-20 text-zinc-500">
        <p className="text-4xl mb-4">💀</p>
        <p>Failed to load trash. The dumpster is on fire.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-black tracking-tighter mb-2">
          The Trash <span className="text-red-500">Feed</span>
        </h1>
        <p className="text-zinc-400 text-sm">AI-generated garbage, judged by an even snarkier AI. Click any card to see more.</p>
      </div>

      {!posts || posts.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <p className="text-5xl mb-4">🗑️</p>
          <p className="text-lg font-semibold">The dumpster is empty.</p>
          <p className="text-sm mt-2">Be the first to throw something in.</p>
          <Link
            href="/submit"
            className="inline-block mt-6 bg-red-500 text-white font-bold px-6 py-3 rounded-full hover:bg-red-400 transition-colors"
          >
            Submit the first trash →
          </Link>
        </div>
      ) : (
        <FeedClient posts={posts as Post[]} />
      )}
    </div>
  );
}
