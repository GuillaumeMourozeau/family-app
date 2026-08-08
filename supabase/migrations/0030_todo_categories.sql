-- Custom to-do categories: family-wide, user-created groupings beyond the
-- 3 built-in priority levels (Urgent/Better sooner/Whenever, which stay
-- hardcoded in the app — "urgent" specifically drives Home's urgent list and
-- push notification routing, so it's never renamed/deleted via this table).
-- A todo with a category_id is grouped by that category instead of priority;
-- priority stays set (defaulted to 'whenever') so existing NOT NULL/urgent
-- logic is untouched.

create table public.todo_categories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null,
  icon text not null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.todo_categories enable row level security;
alter table public.todo_categories replica identity full;

create policy "Family members can view todo categories"
  on public.todo_categories for select
  using (family_id = public.get_my_family_id());

create policy "Family members can insert todo categories"
  on public.todo_categories for insert
  with check (family_id = public.get_my_family_id() and created_by = auth.uid());

alter publication supabase_realtime add table public.todo_categories;

alter table public.todos add column category_id uuid references public.todo_categories (id) on delete set null;
