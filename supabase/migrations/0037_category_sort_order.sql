-- Lets grocery stores and to-do categories be manually reordered (drag to
-- reorder in the app) instead of always showing in creation order.
alter table public.grocery_categories
  add column sort_order integer not null default 0;

alter table public.todo_categories
  add column sort_order integer not null default 0;

-- Backfill existing rows with their current creation order so the first
-- reorder starts from what people already see today.
with ranked as (
  select id, row_number() over (partition by family_id order by created_at) as rn
  from public.grocery_categories
)
update public.grocery_categories gc
set sort_order = ranked.rn
from ranked
where gc.id = ranked.id;

with ranked as (
  select id, row_number() over (partition by family_id order by created_at) as rn
  from public.todo_categories
)
update public.todo_categories tc
set sort_order = ranked.rn
from ranked
where tc.id = ranked.id;
