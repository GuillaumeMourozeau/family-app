-- Family groups + profiles, with RPCs for creating/joining a family by invite code.

create extension if not exists pgcrypto;

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  family_id uuid references public.families (id) on delete set null,
  full_name text,
  created_at timestamptz not null default now()
);

-- Bypasses RLS so policies below can check the caller's family without recursive
-- self-lookups on profiles (which Postgres would otherwise re-evaluate under RLS).
create function public.get_my_family_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select family_id from public.profiles where id = auth.uid();
$$;

alter table public.families enable row level security;
alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Users can view profiles in their family"
  on public.profiles for select
  using (family_id = public.get_my_family_id());

create policy "Users can update their own profile"
  on public.profiles for update
  using (id = auth.uid());

create policy "Users can view their own family"
  on public.families for select
  using (id = public.get_my_family_id());

-- Auto-create a blank profile row whenever a new auth user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.create_family(family_name text, member_name text)
returns public.families
language plpgsql
security definer
set search_path = public
as $$
declare
  new_family public.families;
  new_code text;
begin
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

create function public.join_family(code text, member_name text)
returns public.families
language plpgsql
security definer
set search_path = public
as $$
declare
  target_family public.families;
begin
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
