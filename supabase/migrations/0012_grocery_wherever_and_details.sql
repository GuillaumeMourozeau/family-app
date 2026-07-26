alter table public.grocery_items add column description text;

-- Every family gets a permanent default "Wherever" place, backfilled for
-- existing families here and auto-created for new families below.
insert into public.grocery_categories (family_id, name)
select f.id, 'Wherever'
from public.families f
where not exists (
  select 1 from public.grocery_categories gc
  where gc.family_id = f.id and gc.name = 'Wherever'
);

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

  insert into public.grocery_categories (family_id, name) values (new_family.id, 'Wherever');

  return new_family;
end;
$$;
