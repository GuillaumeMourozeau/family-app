-- Filtered realtime subscriptions (filter: family_id=eq.*) only work for DELETE events
-- if the table's replica identity includes all columns, not just the primary key —
-- otherwise the DELETE's "old row" lacks family_id and the filter never matches, so
-- other screens/devices never hear about the deletion. Affects every table we filter
-- realtime DELETE events on.

alter table public.events replica identity full;
alter table public.todos replica identity full;
alter table public.todo_categories replica identity full;
alter table public.grocery_items replica identity full;
alter table public.grocery_categories replica identity full;
alter table public.grocery_saved_lists replica identity full;
alter table public.messages replica identity full;
alter table public.profiles replica identity full;
