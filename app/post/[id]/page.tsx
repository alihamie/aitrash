import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { Post, CATEGORY_LABELS } from '@/lib/types';
import SlopBuckets from '@/app/components/SlopBuckets';
import UpvoteButton from '@/app/components/UpvoteButton';
import ShareButton from '@/app/components/ShareButton';
import Link from 'next/link';

async function getPost(id: string): Promise<Post | null> {
  const { data } = await supabase.from('posts').select('*').eq('id', id).single();
  return data as Post | null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) return { title: 'Post not found — AITrash' };

  const buckets = '🪣'.repeat(post.ai_rating);
  const title = post.content
    ? `${post.content.slice(0, 60)}${post.content.length > 60 ? '...' : ''} ${buckets}`
    : `AI Trash Image ${buckets}`;

  return {
    title: `${title} — AITrash`,
    description: post.ai_verdict,
    openGraph: {
      title,
      description: post.ai_verdict,
      type: 'article',
      ...(post.image_url ? { images: [post.image_url] } : {}),
    },
    twitter: {
      card: post.image_url ? 'summary_large_image' : 'summary',
      title,
      description: post.ai_verdict,
      ...(post.image_url ? { images: [post.image_url] } : {}),
    },
  };
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) notFound();

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/" className="text-zinc-500 hover:text-zinc-300 text-sm mb-6 inline-flex items-center gap-1 transition-colors">
        ← Back to feed
      </Link>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mt-4">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-full">
            {CATEGORY_LABELS[post.category] ?? post.category}
          </span>
          <SlopBuckets rating={post.ai_rating} size="lg" />
        </div>

        {/* Content */}
        <div className="p-5">
          {post.image_url ? (
            <img src={post.image_url} alt="Submitted trash" className="w-full rounded-xl mb-5 max-h-[500px] object-contain bg-zinc-800" />
          ) : (
            <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap mb-5">{post.content}</p>
          )}

          {/* Verdict */}
          <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-4 mb-5">
            <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-1">AI Verdict</p>
            <p className="text-red-300 font-semibold italic text-lg">&ldquo;{post.ai_verdict}&rdquo;</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <UpvoteButton id={post.id} initial={post.human_upvotes} />
            <ShareButton id={post.id} />
            <span className="text-xs text-zinc-600 ml-auto">
              {new Date(post.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
