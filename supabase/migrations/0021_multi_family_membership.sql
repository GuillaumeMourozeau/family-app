-- Splits "which families am I in" (family_members, many-to-many) from
-- "which family am I currently viewing" (profiles.family_id, unchanged —
-- every existing table's family_id-scoped RLS keeps working exactly as
-- before, since it was always just "my current context", not "my only
-- family"). The switcher UI just calls switch_active_family to repoint it.

create table public.family_members (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (profile_id, family_id)
);

alter table public.family_members enable row level security;
alter table public.family_members replica identity full;

-- Backfill: every existing member's current family becomes their first
-- tracked membership.
insert into public.family_members (profile_id, family_id)
select id, family_id from public.profiles where family_id is not null
on conflict do nothing;

-- Bypasses RLS so the policy below (and profiles/families policies) can
-- check "which families is the caller in" without recursing into
-- family_members' own RLS.
create function public.get_my_family_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select family_id from public.family_members where profile_id = auth.uid();
$$;

create policy "Users can view memberships in their families"
  on public.family_members for select
  using (family_id in (select public.get_my_family_ids()));

create policy "Users can delete their own membership"
  on public.family_members for delete
  using (profile_id = auth.uid());

alter publication supabase_realtime add table public.family_members;

-- profiles: was scoped to "shares my current active family"; now "shares
-- any family with me", since two members can independently be looking at
-- different families at any given moment.
drop policy "Users can view profiles in their family" on public.profiles;
create policy "Users can view profiles in shared families"
  on public.profiles for select
  using (
    id in (
      select profile_id from public.family_members
      where family_id in (select public.get_my_family_ids())
    )
  );

-- families: was scoped to "my one family"; now "any family I've joined",
-- so the switcher can list and display names for all of them.
drop policy "Users can view their own family" on public.families;
create policy "Users can view their families"
  on public.families for select
  using (id in (select public.get_my_family_ids()));

-- create_family / join_family: no longer block a second family — they add
-- a new membership and switch the active context to it. Duplicate-join of
-- the same family is still blocked.
create or replace function public.create_family(family_name text, member_name text)
returns public.families
language plpgsql
security definer
set search_path = public
as $$
declare
  new_family public.families;
  new_code text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.families (name, invite_code)
  values (family_name, new_code)
  returning * into new_family;

  insert into public.family_members (profile_id, family_id) values (auth.uid(), new_family.id);

  update public.profiles
  set family_id = new_family.id, full_name = coalesce(nullif(member_name, ''), full_name)
  where id = auth.uid();

  insert into public.grocery_categories (family_id, name, is_default) values (new_family.id, 'Anywhere', true);

  return new_family;
end;
$$;

create or replace function public.join_family(code text, member_name text)
returns public.families
language plpgsql
security definer
set search_path = public
as $$
declare
  target_family public.families;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into target_family from public.families where invite_code = upper(code);

  if target_family.id is null then
    raise exception 'Invalid invite code';
  end if;

  if exists (
    select 1 from public.family_members
    where profile_id = auth.uid() and family_id = target_family.id
  ) then
    raise exception 'You are already a member of this family';
  end if;

  insert into public.family_members (profile_id, family_id) values (auth.uid(), target_family.id);

  update public.profiles
  set family_id = target_family.id, full_name = coalesce(nullif(member_name, ''), full_name)
  where id = auth.uid();

  return target_family;
end;
$$;

create or replace function public.switch_active_family(target_family_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.family_members
    where profile_id = auth.uid() and family_id = target_family_id
  ) then
    raise exception 'Not a member of that family';
  end if;

  update public.profiles set family_id = target_family_id where id = auth.uid();
end;
$$;

revoke all on function public.switch_active_family(uuid) from public;
grant execute on function public.switch_active_family(uuid) to authenticated;
