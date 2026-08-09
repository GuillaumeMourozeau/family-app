-- Lets a timetable block apply to the whole family instead of one member
-- (e.g. a shared "away on holiday" block), mirroring events'
-- applies_to_whole_family pattern. profile_id becomes optional: null when
-- the block is whole-family, required otherwise.

alter table public.timetable_blocks
  add column applies_to_whole_family boolean not null default false;

alter table public.timetable_blocks
  alter column profile_id drop not null;

alter table public.timetable_blocks
  add constraint timetable_blocks_profile_or_family check (
    (applies_to_whole_family = true and profile_id is null) or
    (applies_to_whole_family = false and profile_id is not null)
  );
