// Triggered by Database Webhooks (see migration 0018) on insert to events,
// todos, grocery_items, and messages. Resolves who in the family should be
// notified, respecting each member's notification_prefs and never notifying
// anyone about a private item (defense in depth — private rows shouldn't
// reach other members at all, but this double-checks).
import { createClient } from "npm:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type Category = "messages" | "calendar" | "todos" | "urgentTodos" | "groceries";

type WebhookPayload = {
  type: "INSERT" | "UPDATE";
  table: string;
  record: Record<string, unknown>;
};

function resolveCategory(table: string, record: Record<string, unknown>): Category | null {
  if (table === "events") return "calendar";
  if (table === "todos") return record.priority === "urgent" ? "urgentTodos" : "todos";
  if (table === "grocery_items") return "groceries";
  if (table === "messages") return "messages";
  return null;
}

function buildNotification(category: Category, record: Record<string, unknown>, authorName: string) {
  switch (category) {
    case "calendar":
      return { title: "New event", body: `${authorName} added "${record.title}"` };
    case "todos":
      return { title: "New to-do", body: `${authorName} added "${record.title}"` };
    case "urgentTodos":
      return { title: "🚨 Urgent to-do", body: `${authorName} added "${record.title}"` };
    case "groceries":
      return { title: "New grocery item", body: `${authorName} added "${record.name}"` };
    case "messages":
      return { title: authorName, body: String(record.content ?? "") };
  }
}

Deno.serve(async (req) => {
  try {
    const payload = (await req.json()) as WebhookPayload;
    const record = payload.record;

    const category = resolveCategory(payload.table, record);
    if (!category) return new Response("ignored table", { status: 200 });

    if (record.is_private) {
      return new Response("private, skipped", { status: 200 });
    }

    const familyId = record.family_id as string | undefined;
    const creatorId = (record.created_by ?? record.profile_id) as string | undefined;
    if (!familyId || !creatorId) return new Response("missing family/creator", { status: 200 });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: author } = await supabase.from("profiles").select("full_name").eq("id", creatorId).single();
    const authorName = author?.full_name ?? "Someone";

    // Recipients are resolved via family_members (everyone who's ever joined
    // this family), not profiles.family_id (which is just each person's
    // currently-active family) — someone browsing a different family right
    // now should still get notified about this one.
    const { data: memberRows } = await supabase
      .from("family_members")
      .select("profile_id")
      .eq("family_id", familyId)
      .neq("profile_id", creatorId);
    const memberIds = (memberRows ?? []).map((r) => r.profile_id as string);
    if (memberIds.length === 0) return new Response("no members", { status: 200 });

    const { data: recipients } = await supabase
      .from("profiles")
      .select("id, notification_prefs")
      .in("id", memberIds);

    const eligibleIds = (recipients ?? [])
      .filter((r) => {
        const prefs = r.notification_prefs as Record<string, boolean> | null;
        return prefs?.[category] ?? true;
      })
      .map((r) => r.id as string);

    if (eligibleIds.length === 0) return new Response("no eligible recipients", { status: 200 });

    const { data: tokenRows } = await supabase.from("push_tokens").select("token").in("profile_id", eligibleIds);
    if (!tokenRows || tokenRows.length === 0) return new Response("no tokens", { status: 200 });

    const notification = buildNotification(category, record, authorName);
    const messages = tokenRows.map((t) => ({
      to: t.token as string,
      sound: "default",
      title: notification.title,
      body: notification.body,
    }));

    await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });

    return new Response("sent", { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response("error", { status: 200 });
  }
});
