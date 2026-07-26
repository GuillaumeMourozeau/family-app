create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now()
);

alter table public.push_tokens enable row level security;

create policy "Users can view their own push tokens"
  on public.push_tokens for select
  using (profile_id = auth.uid());

create policy "Users can insert their own push tokens"
  on public.push_tokens for insert
  with check (profile_id = auth.uid());

create policy "Users can update their own push tokens"
  on public.push_tokens for update
  using (profile_id = auth.uid());

create policy "Users can delete their own push tokens"
  on public.push_tokens for delete
  using (profile_id = auth.uid());

-- Reuses the same keys as the existing (previously UI-only) toggle switches
-- in Settings: messages, calendar, todos, urgentTodos, groceries.
alter table public.profiles add column notification_prefs jsonb not null default
  '{"messages": true, "calendar": true, "todos": true, "urgentTodos": true, "groceries": true}'::jsonb;
