-- Private items: events/todos default visible to the whole family, but the
-- creator can mark one private so it never appears for other members.
alter table public.events add column is_private boolean not null default false;
alter table public.todos add column is_private boolean not null default false;

drop policy "Family members can view events" on public.events;
create policy "Family members can view events"
  on public.events for select
  using (family_id = public.get_my_family_id() and (is_private = false or created_by = auth.uid()));

drop policy "Family members can view todos" on public.todos;
create policy "Family members can view todos"
  on public.todos for select
  using (family_id = public.get_my_family_id() and (is_private = false or created_by = auth.uid()));

-- Recurrence rule, stored on the event and expanded into occurrences client-side.
-- recurrence_freq is null for a non-recurring event.
alter table public.events add column recurrence_freq text
  check (recurrence_freq in ('daily', 'weekly', 'monthly', 'yearly'));
alter table public.events add column recurrence_interval integer not null default 1;
alter table public.events add column recurrence_days_of_week integer[];
alter table public.events add column recurrence_end_type text
  check (recurrence_end_type in ('never', 'on_date', 'after_count'));
alter table public.events add column recurrence_end_date timestamptz;
alter table public.events add column recurrence_count integer;
