create table posts (
  id uuid primary key default gen_random_uuid(),
  content text,
  image_url text,
  category text not null,
  ai_rating int not null,
  ai_verdict text not null,
  human_upvotes int default 0,
  source text default 'web',
  created_at timestamptz default now()
);

create table api_keys (
  id uuid primary key default gen_random_uuid(),
  key_hash text unique not null,
  label text,
  created_at timestamptz default now()
);

create table rate_limits (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null,
  window_start timestamptz not null,
  request_count int default 1
);
