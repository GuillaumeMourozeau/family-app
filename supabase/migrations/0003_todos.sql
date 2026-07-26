-- To-do list: user-defined categories + tasks, scoped to a family, with realtime enabled.

create table public.todo_categories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.todos (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  category_id uuid references public.todo_categories (id) on delete set null,
  title text not null,
  is_complete boolean not null default false,
  assigned_to uuid references public.profiles (id) on delete set null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.todo_categories enable row level security;
alter table public.todos enable row level security;

create policy "Family members can view categories"
  on public.todo_categories for select
  using (family_id = public.get_my_family_id());

create policy "Family members can insert categories"
  on public.todo_categories for insert
  with check (family_id = public.get_my_family_id());

create policy "Family members can delete categories"
  on public.todo_categories for delete
  using (family_id = public.get_my_family_id());

create policy "Family members can view todos"
  on public.todos for select
  using (family_id = public.get_my_family_id());

create policy "Family members can insert todos"
  on public.todos for insert
  with check (family_id = public.get_my_family_id() and created_by = auth.uid());

create policy "Family members can update todos"
  on public.todos for update
  using (family_id = public.get_my_family_id());

create policy "Family members can delete todos"
  on public.todos for delete
  using (family_id = public.get_my_family_id());

alter publication supabase_realtime add table public.todos;
alter publication supabase_realtime add table public.todo_categories;
