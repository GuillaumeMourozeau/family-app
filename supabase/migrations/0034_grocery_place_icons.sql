-- Lets each grocery place (store) show a distinct icon instead of a plain
-- row, for visual variety in the Groceries tab. Defaults every existing and
-- future place to a generic storefront icon until the user picks one.

alter table public.grocery_categories
  add column icon text not null default 'storefront-outline';
