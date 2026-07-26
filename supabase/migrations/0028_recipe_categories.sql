-- Recipes can belong to multiple categories (e.g. a soup as both appetizer
-- and main). A plain text[] with a check constraint is enough since the
-- category set is fixed/small — no need for a join table.
alter table public.recipes add column categories text[] not null default '{}';
alter table public.recipes add constraint recipes_categories_valid check (
  categories <@ array['appetizer', 'main', 'side', 'dessert', 'snack', 'breakfast', 'drink']::text[]
);

-- "Unit" turned out to be unnecessary friction; ingredients are now just
-- quantity + name (e.g. "2" / "eggs", or "200 g" typed straight into name).
alter table public.recipe_ingredients drop column unit;
