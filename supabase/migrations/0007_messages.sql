-- One short "important message" slot per family member, shown on the Home screen.
-- Posting a new message replaces the previous one (upsert keyed on profile_id).

create table public.messages (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  content text not null check (char_length(content) <= 30),
  updated_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "Family members can view messages"
  on public.messages for select
  using (family_id = public.get_my_family_id());

create policy "Users can insert their own message"
  on public.messages for insert
  with check (family_id = public.get_my_family_id() and profile_id = auth.uid());

create policy "Users can update their own message"
  on public.messages for update
  using (profile_id = auth.uid());

create policy "Users can delete their own message"
  on public.messages for delete
  using (profile_id = auth.uid());

alter publication supabase_realtime add table public.messages;
