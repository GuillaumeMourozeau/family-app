-- Item-level category (dairy, vegetables, meats, ...) — distinct from
-- grocery_categories, which despite the name is actually the "place"/store
-- an item belongs to. Curated list lives in app code (lib/groceryItemCategories.ts),
-- so this is a plain text column rather than a lookup table.
alter table public.grocery_items
  add column item_category text not null default 'other';
