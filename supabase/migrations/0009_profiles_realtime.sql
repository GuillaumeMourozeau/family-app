-- profiles was never added to the realtime publication, so even a correctly
-- written subscription on it would never receive postgres_changes events.
alter publication supabase_realtime add table public.profiles;
