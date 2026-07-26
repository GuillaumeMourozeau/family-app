-- Simplify to one shared color for both holiday types; visibility toggles
-- stay separate.
alter table public.families add column holiday_color text not null default '#F59E0B';
update public.families set holiday_color = public_holiday_color;
alter table public.families drop column public_holiday_color;
alter table public.families drop column school_holiday_color;
