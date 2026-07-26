-- Member colors: any family member can recolor any other member (shared,
-- family-wide setting), but profiles.family_id must stay locked down to
-- self-only updates, so this goes through a scoped RPC rather than widening
-- the "update own profile" policy to the whole family.
alter table public.profiles add column color text;

create or replace function public.set_member_color(member_id uuid, new_color text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if (select family_id from public.profiles where id = member_id) is distinct from public.get_my_family_id() then
    raise exception 'Member not in your family';
  end if;
  update public.profiles set color = new_color where id = member_id;
end;
$$;

revoke all on function public.set_member_color(uuid, text) from public;
grant execute on function public.set_member_color(uuid, text) to authenticated;

-- Holiday display settings, family-wide (name/invite_code are also editable
-- through this same policy, matching the existing trust model where any
-- family member can already rename shared resources like grocery places).
alter table public.families add column public_holiday_color text not null default '#F59E0B';
alter table public.families add column school_holiday_color text not null default '#16A34A';
alter table public.families add column school_zone text check (school_zone in ('A', 'B', 'C'));
alter table public.families add column show_public_holidays boolean not null default true;
alter table public.families add column show_school_holidays boolean not null default false;

create policy "Family members can update their family"
  on public.families for update
  using (id = public.get_my_family_id());
