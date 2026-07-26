-- Calendar display settings move from family-wide to per-viewer: each person
-- picks their own holiday visibility/color per family they're in, and their
-- own color for each other member, independent of anyone else's choices.

create table public.calendar_prefs (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  holiday_color text not null default '#F59E0B',
  school_zone text check (school_zone in ('A', 'B', 'C')),
  show_public_holidays boolean not null default true,
  show_school_holidays boolean not null default false,
  primary key (profile_id, family_id)
);

alter table public.calendar_prefs enable row level security;
alter table public.calendar_prefs replica identity full;

create policy "Users can view their own calendar prefs"
  on public.calendar_prefs for select
  using (profile_id = auth.uid());

create policy "Users can upsert their own calendar prefs"
  on public.calendar_prefs for insert
  with check (profile_id = auth.uid());

create policy "Users can update their own calendar prefs"
  on public.calendar_prefs for update
  using (profile_id = auth.uid());

alter publication supabase_realtime add table public.calendar_prefs;

-- Backfill from the old family-wide settings so nobody's display resets.
insert into public.calendar_prefs (profile_id, family_id, holiday_color, school_zone, show_public_holidays, show_school_holidays)
select fm.profile_id, f.id, f.holiday_color, f.school_zone, f.show_public_holidays, f.show_school_holidays
from public.families f
join public.family_members fm on fm.family_id = f.id
on conflict do nothing;

alter table public.families drop column holiday_color;
alter table public.families drop column school_zone;
alter table public.families drop column show_public_holidays;
alter table public.families drop column show_school_holidays;

create table public.member_color_prefs (
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  color text not null,
  primary key (viewer_id, member_id)
);

alter table public.member_color_prefs enable row level security;
alter table public.member_color_prefs replica identity full;

create policy "Users can view their own member color prefs"
  on public.member_color_prefs for select
  using (viewer_id = auth.uid());

create policy "Users can upsert their own member color prefs"
  on public.member_color_prefs for insert
  with check (viewer_id = auth.uid());

create policy "Users can update their own member color prefs"
  on public.member_color_prefs for update
  using (viewer_id = auth.uid());

alter publication supabase_realtime add table public.member_color_prefs;

-- Backfill: everyone starts seeing the old shared colors as their own.
insert into public.member_color_prefs (viewer_id, member_id, color)
select fm.profile_id, p.id, p.color
from public.profiles p
join public.family_members target_fm on target_fm.profile_id = p.id
join public.family_members fm on fm.family_id = target_fm.family_id
where p.color is not null
on conflict do nothing;

drop function if exists public.set_member_color(uuid, text);
alter table public.profiles drop column color;
