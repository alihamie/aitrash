-- Add nullable title column (nullable for backward compat with existing posts)
ALTER TABLE posts
  ADD COLUMN title text CHECK (char_length(title) <= 100);

-- RLS DELETE policy: owners only
CREATE POLICY "Users can delete their own posts"
  ON posts FOR DELETE
  USING (auth.uid() = user_id);

-- Redefine get_hot_posts to include title in return set
DROP FUNCTION IF EXISTS get_hot_posts(integer,integer);
CREATE OR REPLACE FUNCTION get_hot_posts(p_limit integer DEFAULT 25, p_offset integer DEFAULT 0)
RETURNS TABLE (
  id uuid, user_id uuid, title text, content text,
  slop_score integer, verdict text, roast text,
  upvotes integer, downvotes integer, created_at timestamptz,
  username text, hot_score double precision
) AS $$
  SELECT p.id, p.user_id, p.title, p.content, p.slop_score, p.verdict, p.roast,
         p.upvotes, p.downvotes, p.created_at, pr.username,
         (p.upvotes - p.downvotes + 1.0) / POWER(EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600.0 + 2.0, 1.5) AS hot_score
  FROM posts p
  JOIN profiles pr ON pr.id = p.user_id
  ORDER BY hot_score DESC
  LIMIT p_limit OFFSET p_offset;
$$ LANGUAGE sql SECURITY DEFINER;
