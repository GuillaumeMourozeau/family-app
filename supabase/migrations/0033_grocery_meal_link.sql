-- Tracks which meal plan entry (if any) a grocery item was added from, so
-- deleting that meal can offer to clean up the groceries it generated.
-- on delete set null (not cascade): deleting the meal without choosing to
-- also remove its groceries should just unlink them, not silently wipe them.

alter table public.grocery_items
  add column source_meal_entry_id uuid references public.meal_plan_entries (id) on delete set null;
