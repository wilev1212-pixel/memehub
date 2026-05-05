-- ============================================================
-- MEMEHUB — Schema Supabase
-- Colle ce SQL dans : Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- Désactive RLS pour simplifier (app publique sans auth Supabase)
-- Tu pourras l'activer plus tard si besoin de sécurité avancée

-- ── USERS ──────────────────────────────────────────────────
create table if not exists users (
  username   text primary key,
  password   text not null,
  created_at timestamptz default now()
);

-- ── MEMES ──────────────────────────────────────────────────
create table if not exists memes (
  id          text primary key,
  title       text not null,
  image_url   text not null,
  texts       jsonb default '[]',
  author      text references users(username) on delete set null,
  tags        text[] default '{}',
  likes       integer default 1,
  dislikes    integer default 0,
  created_at  timestamptz default now()
);

-- ── VOTES ──────────────────────────────────────────────────
create table if not exists votes (
  user_id   text not null,
  meme_id   text references memes(id) on delete cascade,
  direction text check (direction in ('up','down')),
  primary key (user_id, meme_id)
);

-- ── COMMENTS ───────────────────────────────────────────────
create table if not exists comments (
  id         text primary key,
  meme_id    text references memes(id) on delete cascade,
  author     text not null,
  text       text not null,
  likes      integer default 0,
  created_at timestamptz default now()
);

-- ── COMMENT VOTES ──────────────────────────────────────────
create table if not exists comment_votes (
  user_id    text not null,
  comment_id text references comments(id) on delete cascade,
  primary key (user_id, comment_id)
);

-- ── FOLLOWS ────────────────────────────────────────────────
create table if not exists follows (
  follower text not null,
  followed text not null,
  primary key (follower, followed)
);

-- ── Désactive Row Level Security (accès public) ─────────────
alter table users         disable row level security;
alter table memes         disable row level security;
alter table votes         disable row level security;
alter table comments      disable row level security;
alter table comment_votes disable row level security;
alter table follows       disable row level security;

-- ── SEED DATA (mèmes de démarrage) ─────────────────────────
insert into memes (id, title, image_url, texts, author, tags, likes, dislikes, created_at) values
('d1','Quand le code compile du premier coup','bg:linear-gradient(135deg,#0f0c29,#302b63,#24243e)',
  '[{"id":"s1","text":"QUAND LE CODE","x":50,"y":12,"fontSize":30,"color":"#fff"},{"id":"s2","text":"COMPILE DU PREMIER COUP","x":50,"y":88,"fontSize":26,"color":"#C8FF00"}]',
  'memeur_du_73', '{"dev"}', 847, 14, now() - interval '2 hours'),
('d2','Moi qui attends le café','bg:linear-gradient(135deg,#232526,#414345)',
  '[{"id":"s3","text":"ENCORE 3 MINUTES","x":50,"y":88,"fontSize":26,"color":"#fff"}]',
  'CaffeineAddict', '{"relatable"}', 1204, 23, now() - interval '8 hours'),
('d3','JavaScript en 2025','bg:linear-gradient(135deg,#f12711,#f5af19)',
  '[{"id":"s4","text":"REACT 19 EST SORTI","x":50,"y":80,"fontSize":22,"color":"#fff"},{"id":"s5","text":"MOI:","x":50,"y":15,"fontSize":32,"color":"#fff"}]',
  'js_survivor', '{"dev","js"}', 2100, 88, now() - interval '1 day'),
('d4','Mon cerveau à 3h du mat','bg:linear-gradient(135deg,#1a0000,#8b0000,#ff4500)',
  '[{"id":"s6","text":"DORS","x":50,"y":12,"fontSize":36,"color":"#fff"},{"id":"s7","text":"MAIS ET SI...","x":50,"y":88,"fontSize":28,"color":"#ffff00"}]',
  'insomniaque_fr', '{"relatable"}', 3420, 45, now() - interval '2 days'),
('d5','Emails en vacances','bg:linear-gradient(135deg,#134e5e,#71b280)',
  '[{"id":"s8","text":"JE RÉPONDS VITE FAIT","x":50,"y":88,"fontSize":24,"color":"#fff"}]',
  'WorkaholicMax', '{"boulot"}', 567, 31, now() - interval '5 hours'),
('d6','Mon code sans commentaires','bg:linear-gradient(135deg,#1f005c,#5b0060,#870160,#ac255e)',
  '[{"id":"s9","text":"\"C''EST ÉVIDENT\"","x":50,"y":88,"fontSize":24,"color":"#fff"}]',
  'gitblame', '{"dev"}', 989, 7, now() - interval '12 hours')
on conflict (id) do nothing;

-- Seed users pour les mèmes de démarrage
insert into users (username, password) values
  ('memeur_du_73', 'seed'),
  ('CaffeineAddict', 'seed'),
  ('js_survivor', 'seed'),
  ('insomniaque_fr', 'seed'),
  ('WorkaholicMax', 'seed'),
  ('gitblame', 'seed')
on conflict (username) do nothing;

-- Seed comments
insert into comments (id, meme_id, author, text, likes, created_at) values
  ('c1','d1','CaffeineAddict','C''est arrivé deux fois dans ma carrière 😭', 12, now() - interval '1 hour'),
  ('c2','d1','js_survivor','Screenshot immédiate !', 8, now() - interval '30 minutes'),
  ('c3','d3','memeur_du_73','Trop vrai j''ai arrêté de suivre', 24, now() - interval '2 hours')
on conflict (id) do nothing;
