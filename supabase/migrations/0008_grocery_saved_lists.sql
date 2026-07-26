-- One reusable saved-list template per place (grocery_categories row). Saving
-- overwrites the template for that place; importing re-adds the item names as
-- fresh unchecked grocery_items.

create table public.grocery_saved_lists (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  category_id uuid not null references public.grocery_categories (id) on delete cascade,
  item_names text[] not null default '{}',
  updated_at timestamptz not null default now(),
  unique (category_id)
);

alter table public.grocery_saved_lists enable row level security;

create policy "Family members can view saved lists"
  on public.grocery_saved_lists for select
  using (family_id = public.get_my_family_id());

create policy "Family members can insert saved lists"
  on public.grocery_saved_lists for insert
  with check (family_id = public.get_my_family_id());

create policy "Family members can update saved lists"
  on public.grocery_saved_lists for update
  using (family_id = public.get_my_family_id());
