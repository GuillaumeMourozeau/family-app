-- A timetable block created for several days used to be stored as one row
-- per day, with no link between them — editing or deleting one day left the
-- others behind. Collapsing to a single days_of_week array makes a
-- multi-day block one row: one edit, one delete.

alter table public.timetable_blocks
  add column days_of_week integer[] not null default '{}';

update public.timetable_blocks
  set days_of_week = array[day_of_week]
  where days_of_week = '{}';

alter table public.timetable_blocks
  add constraint timetable_blocks_days_not_empty check (array_length(days_of_week, 1) > 0);

alter table public.timetable_blocks
  drop column day_of_week;
