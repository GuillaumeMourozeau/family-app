-- Weekly recurring timetable (work/school hours etc.) per member, with
-- per-date overrides so a single occurrence can have different hours or be
-- cancelled outright without touching the recurring template. Any family
-- member can edit anyone's timetable (needed since managed members can't
-- enter their own school hours), matching the trust model already used for
-- events/todos.

create table public.timetable_blocks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0 = Monday .. 6 = Sunday
  start_time time not null,
  end_time time not null,
  label text not null default '',
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.timetable_overrides (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.timetable_blocks (id) on delete cascade,
  override_date date not null,
  is_cancelled boolean not null default false,
  start_time time,
  end_time time,
  label text,
  unique (block_id, override_date)
);

alter table public.timetable_blocks enable row level security;
alter table public.timetable_overrides enable row level security;
alter table public.timetable_blocks replica identity full;
alter table public.timetable_overrides replica identity full;

create policy "Family members can view timetable blocks"
  on public.timetable_blocks for select
  using (family_id = public.get_my_family_id());
create policy "Family members can insert timetable blocks"
  on public.timetable_blocks for insert
  with check (family_id = public.get_my_family_id());
create policy "Family members can update timetable blocks"
  on public.timetable_blocks for update
  using (family_id = public.get_my_family_id());
create policy "Family members can delete timetable blocks"
  on public.timetable_blocks for delete
  using (family_id = public.get_my_family_id());

create policy "Family members can view timetable overrides"
  on public.timetable_overrides for select
  using (block_id in (select id from public.timetable_blocks where family_id = public.get_my_family_id()));
create policy "Family members can insert timetable overrides"
  on public.timetable_overrides for insert
  with check (block_id in (select id from public.timetable_blocks where family_id = public.get_my_family_id()));
create policy "Family members can update timetable overrides"
  on public.timetable_overrides for update
  using (block_id in (select id from public.timetable_blocks where family_id = public.get_my_family_id()));
create policy "Family members can delete timetable overrides"
  on public.timetable_overrides for delete
  using (block_id in (select id from public.timetable_blocks where family_id = public.get_my_family_id()));

alter publication supabase_realtime add table public.timetable_blocks;
alter publication supabase_realtime add table public.timetable_overrides;
