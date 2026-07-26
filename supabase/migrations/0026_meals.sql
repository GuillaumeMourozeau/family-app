-- Recipes (reusable, family-wide) + a shared weekly meal plan. A plan entry
-- can point at a recipe (title/details come from it) or stand alone as a
-- quick one-off menu (title typed directly, no recipe_id).

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null,
  details text,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  quantity text,
  unit text,
  name text not null,
  sort_order int not null default 0
);

create table public.meal_plan_entries (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'snack', 'dinner')),
  recipe_id uuid references public.recipes (id) on delete set null,
  title text not null,
  serves int,
  details text,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.meal_plan_entries enable row level security;

alter table public.recipes replica identity full;
alter table public.recipe_ingredients replica identity full;
alter table public.meal_plan_entries replica identity full;

create policy "Family members can view recipes"
  on public.recipes for select
  using (family_id = public.get_my_family_id());
create policy "Family members can insert recipes"
  on public.recipes for insert
  with check (family_id = public.get_my_family_id() and created_by = auth.uid());
create policy "Family members can update recipes"
  on public.recipes for update
  using (family_id = public.get_my_family_id());
create policy "Family members can delete recipes"
  on public.recipes for delete
  using (family_id = public.get_my_family_id());

create policy "Family members can view recipe ingredients"
  on public.recipe_ingredients for select
  using (recipe_id in (select id from public.recipes where family_id = public.get_my_family_id()));
create policy "Family members can insert recipe ingredients"
  on public.recipe_ingredients for insert
  with check (recipe_id in (select id from public.recipes where family_id = public.get_my_family_id()));
create policy "Family members can update recipe ingredients"
  on public.recipe_ingredients for update
  using (recipe_id in (select id from public.recipes where family_id = public.get_my_family_id()));
create policy "Family members can delete recipe ingredients"
  on public.recipe_ingredients for delete
  using (recipe_id in (select id from public.recipes where family_id = public.get_my_family_id()));

create policy "Family members can view meal plan entries"
  on public.meal_plan_entries for select
  using (family_id = public.get_my_family_id());
create policy "Family members can insert meal plan entries"
  on public.meal_plan_entries for insert
  with check (family_id = public.get_my_family_id() and created_by = auth.uid());
create policy "Family members can update meal plan entries"
  on public.meal_plan_entries for update
  using (family_id = public.get_my_family_id());
create policy "Family members can delete meal plan entries"
  on public.meal_plan_entries for delete
  using (family_id = public.get_my_family_id());

alter publication supabase_realtime add table public.recipes;
alter publication supabase_realtime add table public.recipe_ingredients;
alter publication supabase_realtime add table public.meal_plan_entries;
