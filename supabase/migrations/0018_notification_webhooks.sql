-- Fires the send-notification Edge Function on new activity via pg_net
-- (async HTTP, doesn't block the triggering insert/update). Uses the anon
-- key as auth (already public/embedded in this app's eas.json, not a new
-- secret exposure); the function itself uses its own service-role key,
-- auto-injected by Supabase at runtime, for the privileged reads it needs.
create extension if not exists pg_net;

create or replace function public.notify_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://csbbsyoirubdflcuyuzm.supabase.co/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzYmJzeW9pcnViZGZsY3V5dXptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjI0NTMsImV4cCI6MjA5OTY5ODQ1M30.E8ZKlMtliCYnnzs6yod_AlMUX2eYPrYzctvxmokUgrE'
    ),
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'record', row_to_json(NEW)
    ),
    timeout_milliseconds := 5000
  );
  return NEW;
end;
$$;

create trigger notify_on_event_insert
  after insert on public.events
  for each row execute function public.notify_activity();

create trigger notify_on_todo_insert
  after insert on public.todos
  for each row execute function public.notify_activity();

create trigger notify_on_grocery_item_insert
  after insert on public.grocery_items
  for each row execute function public.notify_activity();

-- Messages are upserted (one row per member, replaced on repost), so notify
-- on both insert and update — otherwise a member's second-ever message
-- would never trigger a notification.
create trigger notify_on_message_change
  after insert or update on public.messages
  for each row execute function public.notify_activity();
