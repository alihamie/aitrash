'use client';
import { useEffect, useCallback } from 'react';
import { Post, CATEGORY_LABELS } from '@/lib/types';
import SlopBuckets from './SlopBuckets';
import UpvoteButton from './UpvoteButton';

export default function PostModal({ post, onClose }: { post: Post; onClose: () => void }) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  const handleShare = () => {
    const url = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('Link copied to clipboard!');
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-widest bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-full">
              {CATEGORY_LABELS[post.category] ?? post.category}
            </span>
            <SlopBuckets rating={post.ai_rating} size="sm" />
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors text-xl">✕</button>
        </div>

        {/* Content */}
        <div className="p-5">
          {post.image_url ? (
            <img src={post.image_url} alt="Submitted trash" className="w-full rounded-xl mb-4 max-h-96 object-contain bg-zinc-800" />
          ) : (
            <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap mb-4">{post.content}</p>
          )}

          {/* Verdict */}
          <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-4 mb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-1">AI Verdict</p>
            <p className="text-red-300 font-semibold italic">&ldquo;{post.ai_verdict}&rdquo;</p>
          </div>

          <div className="flex items-center gap-3">
            <UpvoteButton id={post.id} initial={post.human_upvotes} />
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all"
            >
              🔗 Share
            </button>
            <a
              href={`/post/${post.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all"
            >
              ↗ Open
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
