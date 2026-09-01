// The single source of truth for "how to actually perform a write" for
// every offline-queueable mutation kind. Each hook's mutation function
// calls the matching entry directly when online, and the same entry is
// what replays the mutation later if it had to be queued — so the two
// paths can never drift apart.
//
// Populated incrementally as each hook is wired for offline support.
import { supabase } from "@/lib/supabase";

// supabase-js returns { error } instead of throwing — both withOfflineQueue's
// live-path fallback and the replay engine's retry-on-failure detection
// need a real throw to know something went wrong, so every handler below
// routes its result through this.
function throwIfError(result: { error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message);
}

// Shared shapes — most tables' add/update/delete only need "insert this
// row", "patch these columns", "delete by id".
export type InsertPayload = { id: string; familyId: string; createdBy: string; row: Record<string, unknown> };
export type UpdatePayload = { id: string; row: Record<string, unknown> };
export type DeletePayload = { id: string };

export type EventInsertPayload = InsertPayload & { participantIds: string[]; appliesToWholeFamily: boolean };
export type EventUpdatePayload = UpdatePayload & { participantIds: string[]; appliesToWholeFamily: boolean };
export type EventDeletePayload = DeletePayload;

// Deliberately loosely typed (`any` payload) — this is a heterogeneous
// dispatch table keyed by mutation kind, and TS function-parameter variance
// makes a precisely-typed version fight every entry. Each hook calls its
// own specific handler directly with a properly-typed payload; only the
// generic replay engine in queue.ts goes through this loose registry.
export const offlineHandlers: Record<string, (payload: any) => Promise<void>> = {
  "events:add": async (payload: EventInsertPayload) => {
    throwIfError(
      await supabase.from("events").insert({ id: payload.id, family_id: payload.familyId, created_by: payload.createdBy, ...payload.row })
    );
    if (!payload.appliesToWholeFamily && payload.participantIds.length > 0) {
      throwIfError(
        await supabase
          .from("event_participants")
          .insert(payload.participantIds.map((profileId) => ({ event_id: payload.id, profile_id: profileId })))
      );
    }
  },
  "events:update": async (payload: EventUpdatePayload) => {
    throwIfError(await supabase.from("events").update(payload.row).eq("id", payload.id));
    throwIfError(await supabase.from("event_participants").delete().eq("event_id", payload.id));
    if (!payload.appliesToWholeFamily && payload.participantIds.length > 0) {
      throwIfError(
        await supabase
          .from("event_participants")
          .insert(payload.participantIds.map((profileId) => ({ event_id: payload.id, profile_id: profileId })))
      );
    }
  },
  "events:delete": async (payload: EventDeletePayload) => {
    throwIfError(await supabase.from("events").delete().eq("id", payload.id));
  },

  "todos:add": async (payload: InsertPayload) => {
    throwIfError(
      await supabase.from("todos").insert({ id: payload.id, family_id: payload.familyId, created_by: payload.createdBy, ...payload.row })
    );
  },
  "todos:update": async (payload: UpdatePayload) => {
    throwIfError(await supabase.from("todos").update(payload.row).eq("id", payload.id));
  },
  "todos:toggle": async (payload: { id: string; isComplete: boolean; completedAt: string | null }) => {
    throwIfError(
      await supabase.from("todos").update({ is_complete: payload.isComplete, completed_at: payload.completedAt }).eq("id", payload.id)
    );
  },
  "todos:delete": async (payload: DeletePayload) => {
    throwIfError(await supabase.from("todos").delete().eq("id", payload.id));
  },

  "todoCategories:add": async (payload: InsertPayload) => {
    throwIfError(
      await supabase
        .from("todo_categories")
        .insert({ id: payload.id, family_id: payload.familyId, created_by: payload.createdBy, ...payload.row })
    );
  },
  "todoCategories:reorder": async (payload: { updates: { id: string; sortOrder: number }[] }) => {
    for (const u of payload.updates) {
      throwIfError(await supabase.from("todo_categories").update({ sort_order: u.sortOrder }).eq("id", u.id));
    }
  },

  // grocery_categories (stores) has no created_by column, unlike most other
  // tables here — only id/family_id/row apply.
  "groceryPlaces:add": async (payload: InsertPayload) => {
    throwIfError(await supabase.from("grocery_categories").insert({ id: payload.id, family_id: payload.familyId, ...payload.row }));
  },
  "groceryPlaces:reorder": async (payload: { updates: { id: string; sortOrder: number }[] }) => {
    for (const u of payload.updates) {
      throwIfError(await supabase.from("grocery_categories").update({ sort_order: u.sortOrder }).eq("id", u.id));
    }
  },
  "groceryPlaces:update": async (payload: UpdatePayload) => {
    throwIfError(await supabase.from("grocery_categories").update(payload.row).eq("id", payload.id));
  },
  "groceryPlaces:delete": async (payload: { id: string; reassignItemsToId: string; promoteToDefaultId: string | null }) => {
    throwIfError(
      await supabase.from("grocery_items").update({ category_id: payload.reassignItemsToId }).eq("category_id", payload.id)
    );
    if (payload.promoteToDefaultId) {
      throwIfError(await supabase.from("grocery_categories").update({ is_default: true }).eq("id", payload.promoteToDefaultId));
    }
    throwIfError(await supabase.from("grocery_categories").delete().eq("id", payload.id));
  },

  "groceryItems:add": async (payload: InsertPayload) => {
    const result = await supabase
      .from("grocery_items")
      .insert({ id: payload.id, family_id: payload.familyId, created_by: payload.createdBy, ...payload.row });
    // A unique-constraint conflict here just means someone else (or an
    // earlier queued mutation) already added the same item at the same
    // place — that's the outcome the user wanted, not a failure.
    if (result.error && result.error.code !== "23505") throw new Error(result.error.message);
  },
  "groceryItems:update": async (payload: UpdatePayload) => {
    throwIfError(await supabase.from("grocery_items").update(payload.row).eq("id", payload.id));
  },
  "groceryItems:delete": async (payload: DeletePayload) => {
    throwIfError(await supabase.from("grocery_items").delete().eq("id", payload.id));
  },
  "groceryItems:archiveOne": async (payload: DeletePayload) => {
    throwIfError(await supabase.from("grocery_items").update({ is_archived: true }).eq("id", payload.id));
  },
  "groceryItems:archiveChecked": async (payload: { familyId: string }) => {
    throwIfError(
      await supabase.from("grocery_items").update({ is_archived: true }).eq("family_id", payload.familyId).eq("is_checked", true)
    );
  },
  "groceryItems:archiveForMeal": async (payload: { mealEntryId: string }) => {
    throwIfError(await supabase.from("grocery_items").update({ is_archived: true }).eq("source_meal_entry_id", payload.mealEntryId));
  },

  "mealPlan:add": async (payload: InsertPayload) => {
    throwIfError(
      await supabase
        .from("meal_plan_entries")
        .insert({ id: payload.id, family_id: payload.familyId, created_by: payload.createdBy, ...payload.row })
    );
  },
  "mealPlan:update": async (payload: UpdatePayload) => {
    throwIfError(await supabase.from("meal_plan_entries").update(payload.row).eq("id", payload.id));
  },
  "mealPlan:delete": async (payload: DeletePayload) => {
    throwIfError(await supabase.from("meal_plan_entries").delete().eq("id", payload.id));
  },

  "timetableBlocks:add": async (payload: InsertPayload) => {
    throwIfError(
      await supabase
        .from("timetable_blocks")
        .insert({ id: payload.id, family_id: payload.familyId, created_by: payload.createdBy, ...payload.row })
    );
  },
  "timetableBlocks:update": async (payload: UpdatePayload) => {
    throwIfError(await supabase.from("timetable_blocks").update(payload.row).eq("id", payload.id));
  },
  "timetableBlocks:delete": async (payload: DeletePayload) => {
    throwIfError(await supabase.from("timetable_blocks").delete().eq("id", payload.id));
  },
  // timetable_overrides has no created_by/family_id — uniqueness is
  // (block_id, override_date), which is also what upsert conflict-resolves on.
  "timetableOverrides:upsert": async (payload: { row: Record<string, unknown> }) => {
    throwIfError(await supabase.from("timetable_overrides").upsert(payload.row, { onConflict: "block_id,override_date" }));
  },
  "timetableOverrides:upsertMany": async (payload: { rows: Record<string, unknown>[] }) => {
    throwIfError(await supabase.from("timetable_overrides").upsert(payload.rows, { onConflict: "block_id,override_date" }));
  },
  "timetableOverrides:clear": async (payload: { blockId: string; date: string }) => {
    throwIfError(
      await supabase.from("timetable_overrides").delete().eq("block_id", payload.blockId).eq("override_date", payload.date)
    );
  },

  "familyMembers:updateColor": async (payload: { viewerId: string; memberId: string; color: string }) => {
    throwIfError(
      await supabase.from("member_color_prefs").upsert({ viewer_id: payload.viewerId, member_id: payload.memberId, color: payload.color })
    );
  },

  "calendarPrefs:update": async (payload: { row: Record<string, unknown> }) => {
    throwIfError(await supabase.from("calendar_prefs").upsert(payload.row));
  },
};
