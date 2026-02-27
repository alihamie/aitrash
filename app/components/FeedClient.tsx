'use client';
import { useState } from 'react';
import { Post, CATEGORY_LABELS } from '@/lib/types';
import SlopBuckets from './SlopBuckets';
import UpvoteButton from './UpvoteButton';
import PostModal from './PostModal';

function PostCard({ post, onClick }: { post: Post; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 cursor-pointer transition-all group"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <span className="text-xs font-bold uppercase tracking-widest bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-full flex-shrink-0">
          {CATEGORY_LABELS[post.category] ?? post.category}
        </span>
        <SlopBuckets rating={post.ai_rating} size="sm" />
      </div>

      {post.image_url ? (
        <img
          src={post.image_url}
          alt="Submitted trash"
          className="w-full h-40 object-cover rounded-lg mb-3 bg-zinc-800"
        />
      ) : (
        <p className="text-zinc-300 text-sm leading-relaxed mb-3 line-clamp-3">{post.content}</p>
      )}

      <div className="border-t border-zinc-800 pt-3 flex items-center justify-between gap-3">
        <p className="text-red-400 text-xs font-semibold italic flex-1 line-clamp-1">
          🤖 &ldquo;{post.ai_verdict}&rdquo;
        </p>
        <div onClick={e => e.stopPropagation()}>
          <UpvoteButton id={post.id} initial={post.human_upvotes} />
        </div>
      </div>
    </div>
  );
}

export default function FeedClient({ posts }: { posts: Post[] }) {
  const [selected, setSelected] = useState<Post | null>(null);

  return (
    <>
      <div className="space-y-4">
        {posts.map(post => (
          <PostCard key={post.id} post={post} onClick={() => setSelected(post)} />
        ))}
      </div>
      {selected && <PostModal post={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
