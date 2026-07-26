-- Fixes for the groceries UX round: rename Wherever -> Anywhere (tracked via a
-- stable is_default flag instead of matching on name, since places can now be
-- renamed), remove the "no place" bucket by backfilling orphaned items, clean
-- up any duplicate active items that slipped through before the app-level
-- guard existed, and add a DB-level uniqueness guarantee so duplicates can't
-- reoccur even under concurrent taps from two devices.

alter table public.grocery_categories add column is_default boolean not null default false;

update public.grocery_categories set is_default = true, name = 'Anywhere' where name = 'Wherever';

update public.grocery_items gi
set category_id = gc.id
from public.grocery_categories gc
where gi.category_id is null
  and gc.family_id = gi.family_id
  and gc.is_default = true;

-- Collapse pre-existing duplicate active items (same family/place/name),
-- keeping the oldest row, before the unique index can be created.
with ranked as (
  select id, row_number() over (
    partition by family_id, category_id, lower(name)
    order by created_at asc
  ) as rn
  from public.grocery_items
  where is_archived = false
)
delete from public.grocery_items
where id in (select id from ranked where rn > 1);

create unique index if not exists grocery_items_active_name_unique
  on public.grocery_items (family_id, category_id, lower(name))
  where is_archived = false;

create policy "Family members can update grocery categories"
  on public.grocery_categories for update
  using (family_id = public.get_my_family_id());

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

  insert into public.grocery_categories (family_id, name, is_default) values (new_family.id, 'Anywhere', true);

  return new_family;
end;
$$;
