-- ============================================================
-- AI Trash Rewrite Migration
-- Drops old tables, creates new schema with auth, votes, RLS
-- ============================================================

-- 1. Drop old tables
DROP TABLE IF EXISTS rate_limits CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS posts CASCADE;

-- 2. Profiles table (linked to Supabase Auth)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL CHECK (
    char_length(username) >= 3
    AND char_length(username) <= 20
    AND username ~ '^[a-zA-Z0-9_]+$'
  ),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 3. Posts table
CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 5000),
  slop_score integer NOT NULL CHECK (slop_score >= 0 AND slop_score <= 100),
  verdict text NOT NULL,
  roast text NOT NULL,
  upvotes integer NOT NULL DEFAULT 0,
  downvotes integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 4. Votes table (one vote per user per post)
CREATE TABLE votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  vote_type text NOT NULL CHECK (vote_type IN ('slop', 'clean')),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, post_id)
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_upvotes ON posts(upvotes DESC, created_at DESC);
CREATE INDEX idx_votes_user_post ON votes(user_id, post_id);
CREATE INDEX idx_votes_post ON votes(post_id);
CREATE INDEX idx_posts_user_created ON posts(user_id, created_at DESC);

-- ============================================================
-- RLS Policies
-- ============================================================

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Posts
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts are viewable by everyone"
  ON posts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Votes
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Votes are viewable by everyone"
  ON votes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert their own votes"
  ON votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes"
  ON votes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- Trigger: Atomic vote counter updates
-- ============================================================
CREATE OR REPLACE FUNCTION handle_vote_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'slop' THEN
      UPDATE posts SET upvotes = upvotes + 1 WHERE id = NEW.post_id;
    ELSIF NEW.vote_type = 'clean' THEN
      UPDATE posts SET downvotes = downvotes + 1 WHERE id = NEW.post_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'slop' THEN
      UPDATE posts SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = OLD.post_id;
    ELSIF OLD.vote_type = 'clean' THEN
      UPDATE posts SET downvotes = GREATEST(downvotes - 1, 0) WHERE id = OLD.post_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_vote_change
  AFTER INSERT OR DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION handle_vote_change();

-- ============================================================
-- RPC: Get user post count in last 24 hours (rate limiting)
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_post_count_today(p_user_id uuid)
RETURNS integer AS $$
  SELECT COUNT(*)::integer
  FROM posts
  WHERE user_id = p_user_id
    AND created_at > now() - interval '24 hours';
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================
-- RPC: Get hot posts with pagination
-- ============================================================
CREATE OR REPLACE FUNCTION get_hot_posts(p_limit integer DEFAULT 25, p_offset integer DEFAULT 0)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  content text,
  slop_score integer,
  verdict text,
  roast text,
  upvotes integer,
  downvotes integer,
  created_at timestamptz,
  username text,
  hot_score double precision
) AS $$
  SELECT
    p.id,
    p.user_id,
    p.content,
    p.slop_score,
    p.verdict,
    p.roast,
    p.upvotes,
    p.downvotes,
    p.created_at,
    pr.username,
    (p.upvotes - p.downvotes + 1.0) / POWER(EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600.0 + 2.0, 1.5) AS hot_score
  FROM posts p
  JOIN profiles pr ON pr.id = p.user_id
  ORDER BY hot_score DESC
  LIMIT p_limit OFFSET p_offset;
$$ LANGUAGE sql SECURITY DEFINER;
