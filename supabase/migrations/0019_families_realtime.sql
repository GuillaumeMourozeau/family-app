-- families was the one table in this app never added to the realtime
-- publication. Its postgres_changes subscription (useFamily.ts) has been
-- silently inert this whole time: any family-level setting (holiday colors,
-- school zone, visibility toggles) only ever showed up for the tab/screen
-- that made the change locally (via optimistic state), never propagating to
-- other already-mounted screens or other devices until a full app restart.
alter publication supabase_realtime add table public.families;
