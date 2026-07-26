-- Shared family calendar: events with a type (for filtering) and optional specific
-- participants (event_participants). applies_to_whole_family=true means no row needed
-- in event_participants; it's for the whole family by default.

create table public.events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  title text not null,
  description text,
  event_type text not null default 'general' check (event_type in ('general', 'sports', 'work')),
  start_at timestamptz not null,
  all_day boolean not null default false,
  applies_to_whole_family boolean not null default true,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.event_participants (
  event_id uuid not null references public.events (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  primary key (event_id, profile_id)
);

alter table public.events enable row level security;
alter table public.event_participants enable row level security;

create policy "Family members can view events"
  on public.events for select
  using (family_id = public.get_my_family_id());

create policy "Family members can insert events"
  on public.events for insert
  with check (family_id = public.get_my_family_id() and created_by = auth.uid());

create policy "Family members can update events"
  on public.events for update
  using (family_id = public.get_my_family_id());

create policy "Family members can delete events"
  on public.events for delete
  using (family_id = public.get_my_family_id());

create policy "Family members can view event participants"
  on public.event_participants for select
  using (event_id in (select id from public.events where family_id = public.get_my_family_id()));

create policy "Family members can insert event participants"
  on public.event_participants for insert
  with check (event_id in (select id from public.events where family_id = public.get_my_family_id()));

create policy "Family members can delete event participants"
  on public.event_participants for delete
  using (event_id in (select id from public.events where family_id = public.get_my_family_id()));

alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.event_participants;
