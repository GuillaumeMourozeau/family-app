-- Categories added complexity without pulling their weight; dropped from the
-- to-do UI, so drop the underlying schema too rather than leaving it dangling.
alter table public.todos drop column category_id;
drop table public.todo_categories;
