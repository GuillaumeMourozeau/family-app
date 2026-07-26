alter table public.todos
  add column priority text not null default 'whenever' check (priority in ('urgent', 'soon', 'whenever'));
