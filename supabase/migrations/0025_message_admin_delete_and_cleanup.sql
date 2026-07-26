-- Admins can clear anyone's message in their family, not just their own.
-- Postgres OR's multiple permissive policies for the same command together,
-- so this adds to (not replaces) "Users can delete their own message".
create policy "Admins can delete messages in their family"
  on public.messages for delete
  using (
    family_id in (select family_id from public.family_members where profile_id = auth.uid() and role = 'admin')
  );

-- Removing a member should also clear whatever they last posted to that
-- family's Home tab. profiles.id -> messages has no cascade for this case
-- (a real member's profile row survives removal; only managed members'
-- profiles get deleted, which does cascade) so this is explicit.
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

  delete from public.messages
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
