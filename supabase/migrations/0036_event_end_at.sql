-- Events had no concept of duration — every event was a single instant.
-- Adds an end_at so events can span a time range (timed) or several days
-- (all-day), matching the Google Calendar-style start/end picker in the app.
-- Existing events had no duration, so backfill end_at = start_at.

alter table public.events
  add column end_at timestamptz;

update public.events
  set end_at = start_at
  where end_at is null;

alter table public.events
  alter column end_at set not null;

alter table public.events
  add constraint events_end_at_after_start check (end_at >= start_at);
