export default function SlopBuckets({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-base';
  return (
    <span className={cls} title={`${rating}/5 slop buckets`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rating ? 'opacity-100' : 'opacity-20'}>🪣</span>
      ))}
    </span>
  );
}
