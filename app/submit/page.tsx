'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

const CATEGORIES = [
  { value: 'linkedin', label: '💼 LinkedIn' },
  { value: 'cover_letter', label: '📄 Cover Letter' },
  { value: 'blog', label: '📝 Blog Post' },
  { value: 'email', label: '📧 Email' },
  { value: 'image', label: '🖼️ Image' },
  { value: 'other', label: '🌀 Other' },
];

const LOADING_MSGS = [
  'Judging your trash...',
  'Cringing at this...',
  'Summoning the AI Critic...',
  'Assigning slop buckets...',
  'Crafting a devastating verdict...',
  'Almost done roasting you...',
];

export default function SubmitPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [category, setCategory] = useState('linkedin');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MSGS[0]);
  const [error, setError] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB.'); return; }
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setError('');
    setCategory('image');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'text' && !content.trim()) return;
    if (mode === 'image' && !image) return;

    setLoading(true);
    setError('');

    let msgIdx = 0;
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % LOADING_MSGS.length;
      setLoadingMsg(LOADING_MSGS[msgIdx]);
    }, 1400);

    try {
      const fd = new FormData();
      fd.append('category', category);
      if (mode === 'text') fd.append('content', content.trim());
      else if (image) fd.append('image', image);

      const res = await fetch('/api/submit', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit.');
      setLoading(false);
    } finally {
      clearInterval(interval);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-black tracking-tighter mb-2">
          Submit Your <span className="text-red-500">Trash</span>
        </h1>
        <p className="text-zinc-400 text-sm">Paste text or upload an image. The Judge is waiting.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Text / Image toggle */}
        <div className="flex rounded-xl overflow-hidden border border-zinc-800">
          {(['text', 'image'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 py-3 text-sm font-bold transition-colors ${mode === m ? 'bg-zinc-800 text-white' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
            >
              {m === 'text' ? '📝 Text' : '🖼️ Image'}
            </button>
          ))}
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Category</label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={`px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition-all border ${
                  category === cat.value
                    ? 'bg-red-500/10 border-red-500 text-red-400'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        {mode === 'text' ? (
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">The Trash</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Paste your AI-generated masterpiece here... 🤡"
              rows={10}
              required
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 placeholder-zinc-600 text-sm focus:outline-none focus:border-red-500/50 resize-none transition-colors"
            />
            <p className="text-xs text-zinc-600 mt-1">{content.length} / 2000 chars</p>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Upload Image</label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="w-full max-h-64 object-contain rounded-xl bg-zinc-900 border border-zinc-800" />
                <button
                  type="button"
                  onClick={() => { setImage(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = ''; }}
                  className="absolute top-2 right-2 bg-zinc-900/80 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-red-500 transition-colors"
                >✕</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-zinc-700 rounded-xl py-12 text-zinc-500 hover:border-red-500/50 hover:text-zinc-400 transition-colors text-sm"
              >
                <p className="text-3xl mb-2">🖼️</p>
                <p>Click to upload image (max 5MB)</p>
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-950/50 border border-red-800 text-red-400 rounded-xl px-4 py-3 text-sm">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading || (mode === 'text' ? !content.trim() : !image)}
          className="w-full bg-red-500 hover:bg-red-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-lg py-4 rounded-xl transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin inline-block">🪣</span> {loadingMsg}
            </span>
          ) : 'Judge My Trash 🤖'}
        </button>
      </form>
    </div>
  );
}
