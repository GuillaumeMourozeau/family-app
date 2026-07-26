-- "What's new" feed: each member's own bookmark of when they last checked,
-- defaulted to now() so existing users aren't flooded with all past history
-- the moment this ships.
alter table public.profiles add column last_seen_activity_at timestamptz not null default now();

-- Which Home sections a member wants to see, self-editable only (covered by
-- the existing "Users can update their own profile" policy).
alter table public.profiles add column home_visible_sections text[]
  not null default array['messages', 'whatsnew', 'today', 'urgent_todos'];
