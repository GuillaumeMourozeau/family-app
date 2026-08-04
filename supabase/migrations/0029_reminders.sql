-- Reminders. Events get Google Calendar-style "N minutes before start" offsets
-- (possibly several per event); todos get a recurring daily/weekly nudge that
-- keeps firing, on each concerned member's own device, until the todo is done.
alter table public.events add column reminder_offsets_minutes integer[];

alter table public.todos add column reminder_enabled boolean not null default false;
alter table public.todos add column reminder_freq text check (reminder_freq in ('daily', 'weekly'));
alter table public.todos add column reminder_time text;
alter table public.todos add column reminder_weekday integer check (reminder_weekday between 0 and 6);
