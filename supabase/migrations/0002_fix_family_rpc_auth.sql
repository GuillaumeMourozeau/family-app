-- create_family/join_family were callable by unauthenticated (anon) clients because
-- Postgres grants EXECUTE to PUBLIC by default and the functions never checked auth.uid().
-- Revoke PUBLIC access and add an explicit auth check as defense in depth.

revoke execute on function public.create_family(text, text) from public;
revoke execute on function public.join_family(text, text) from public;

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

  if exists (select 1 from public.profiles where id = auth.uid() and family_id is not null) then
    raise exception 'You already belong to a family';
  end if;

  new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.families (name, invite_code)
  values (family_name, new_code)
  returning * into new_family;

  update public.profiles
  set family_id = new_family.id, full_name = coalesce(nullif(member_name, ''), full_name)
  where id = auth.uid();

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

  if exists (select 1 from public.profiles where id = auth.uid() and family_id is not null) then
    raise exception 'You already belong to a family';
  end if;

  select * into target_family from public.families where invite_code = upper(code);

  if target_family.id is null then
    raise exception 'Invalid invite code';
  end if;

  update public.profiles
  set family_id = target_family.id, full_name = coalesce(nullif(member_name, ''), full_name)
  where id = auth.uid();

  return target_family;
end;
$$;

grant execute on function public.create_family(text, text) to authenticated;
grant execute on function public.join_family(text, text) to authenticated;

-- Clean up the row created while testing this gap from the CLI.
delete from public.families where invite_code = 'EB2EA2';
