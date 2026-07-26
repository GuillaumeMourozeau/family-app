-- Grocery list: user-defined categories + items, scoped to a family, with realtime enabled.
-- is_archived lets "clear checked" hide items from the active list while keeping them
-- around as history for "recently used" quick-add suggestions.

create table public.grocery_categories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.grocery_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  category_id uuid references public.grocery_categories (id) on delete set null,
  name text not null,
  is_checked boolean not null default false,
  is_archived boolean not null default false,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  checked_at timestamptz
);

alter table public.grocery_categories enable row level security;
alter table public.grocery_items enable row level security;

create policy "Family members can view grocery categories"
  on public.grocery_categories for select
  using (family_id = public.get_my_family_id());

create policy "Family members can insert grocery categories"
  on public.grocery_categories for insert
  with check (family_id = public.get_my_family_id());

create policy "Family members can delete grocery categories"
  on public.grocery_categories for delete
  using (family_id = public.get_my_family_id());

create policy "Family members can view grocery items"
  on public.grocery_items for select
  using (family_id = public.get_my_family_id());

create policy "Family members can insert grocery items"
  on public.grocery_items for insert
  with check (family_id = public.get_my_family_id() and created_by = auth.uid());

create policy "Family members can update grocery items"
  on public.grocery_items for update
  using (family_id = public.get_my_family_id());

create policy "Family members can delete grocery items"
  on public.grocery_items for delete
  using (family_id = public.get_my_family_id());

alter publication supabase_realtime add table public.grocery_items;
alter publication supabase_realtime add table public.grocery_categories;
