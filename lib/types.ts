export type Post = {
  id: string;
  content: string | null;
  image_url: string | null;
  category: string;
  ai_rating: number;
  ai_verdict: string;
  human_upvotes: number;
  source: string;
  created_at: string;
};

export type JudgeResult = {
  rating: number;
  verdict: string;
};

export const CATEGORY_LABELS: Record<string, string> = {
  linkedin: '💼 LinkedIn',
  cover_letter: '📄 Cover Letter',
  blog: '📝 Blog Post',
  email: '📧 Email',
  image: '🖼️ Image',
  other: '🌀 Other',
};
