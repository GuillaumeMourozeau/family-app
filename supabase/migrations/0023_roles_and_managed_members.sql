-- Admin/user roles (per membership, so someone can be admin in one family
-- and a plain member in another) + "managed members" — family members with
-- no phone/login of their own (e.g. young kids), added and edited on their
-- behalf by any real member of the family.

alter table public.family_members
  add column role text not null default 'user' check (role in ('admin', 'user'));

-- Backfill: we never recorded who created each existing family, so make
-- everyone currently in it an admin rather than risk locking real owners
-- out of admin-only actions. Low-risk while the user base is small (beta).
update public.family_members set role = 'admin';

-- create_family: the creator is the first admin of their new family.
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

  insert into public.family_members (profile_id, family_id, role) values (auth.uid(), new_family.id, 'admin');

  update public.profiles
  set family_id = new_family.id, full_name = coalesce(nullif(member_name, ''), full_name)
  where id = auth.uid();

  insert into public.grocery_categories (family_id, name, is_default) values (new_family.id, 'Anywhere', true);

  return new_family;
end;
$$;

-- join_family: joiners land as plain members; only an existing admin can
-- promote them later.
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

  insert into public.family_members (profile_id, family_id, role) values (auth.uid(), target_family.id, 'user');

  update public.profiles
  set family_id = target_family.id, full_name = coalesce(nullif(member_name, ''), full_name)
  where id = auth.uid();

  return target_family;
end;
$$;

create or replace function public.promote_to_admin(target_profile_id uuid, target_family_id uuid)
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
    where profile_id = auth.uid() and family_id = target_family_id and role = 'admin'
  ) then
    raise exception 'Only admins can promote members';
  end if;

  update public.family_members set role = 'admin'
  where profile_id = target_profile_id and family_id = target_family_id;
end;
$$;

revoke all on function public.promote_to_admin(uuid, uuid) from public;
grant execute on function public.promote_to_admin(uuid, uuid) to authenticated;

-- families: renaming is now admin-only (previously any member could edit).
drop policy "Family members can update their family" on public.families;
create policy "Admins can update their family"
  on public.families for update
  using (
    id in (select family_id from public.family_members where profile_id = auth.uid() and role = 'admin')
  );

create or replace function public.remove_family_member(target_profile_id uuid, target_family_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_is_managed boolean;
  fallback_family uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if target_profile_id = auth.uid() then
    raise exception 'Admins cannot remove themselves';
  end if;

  if not exists (
    select 1 from public.family_members
    where profile_id = auth.uid() and family_id = target_family_id and role = 'admin'
  ) then
    raise exception 'Only admins can remove members';
  end if;

  select is_managed into target_is_managed from public.profiles where id = target_profile_id;

  delete from public.family_members
  where profile_id = target_profile_id and family_id = target_family_id;

  if target_is_managed then
    -- Managed members only exist inside the family that created them.
    delete from public.profiles where id = target_profile_id;
  else
    -- If that was their active family, fall back to another membership
    -- (or none, which the app treats as "pick/join a family").
    select family_id into fallback_family
    from public.family_members where profile_id = target_profile_id limit 1;

    update public.profiles set family_id = fallback_family
    where id = target_profile_id and family_id = target_family_id;
  end if;
end;
$$;

revoke all on function public.remove_family_member(uuid, uuid) from public;
grant execute on function public.remove_family_member(uuid, uuid) to authenticated;

-- Managed members: no auth.users row, so profiles.id can't keep its strict
-- FK to auth.users for these rows.
alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles add column is_managed boolean not null default false;
alter table public.profiles add column managed_by uuid references public.profiles (id) on delete set null;

create or replace function public.add_managed_member(target_family_id uuid, member_name text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  new_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.family_members where profile_id = auth.uid() and family_id = target_family_id
  ) then
    raise exception 'Not a member of that family';
  end if;

  insert into public.profiles (id, family_id, full_name, is_managed, managed_by)
  values (gen_random_uuid(), target_family_id, member_name, true, auth.uid())
  returning * into new_profile;

  insert into public.family_members (profile_id, family_id, role)
  values (new_profile.id, target_family_id, 'user');

  return new_profile;
end;
$$;

revoke all on function public.add_managed_member(uuid, text) from public;
grant execute on function public.add_managed_member(uuid, text) to authenticated;

create or replace function public.rename_member(target_member_id uuid, new_name text)
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
    select 1
    from public.family_members caller
    join public.family_members target on target.family_id = caller.family_id
    where caller.profile_id = auth.uid() and target.profile_id = target_member_id
  ) then
    raise exception 'Not a shared family member';
  end if;

  update public.profiles set full_name = new_name where id = target_member_id;
end;
$$;

revoke all on function public.rename_member(uuid, text) from public;
grant execute on function public.rename_member(uuid, text) to authenticated;
