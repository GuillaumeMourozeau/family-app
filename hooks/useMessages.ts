import { useCallback, useEffect, useId, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { readCache, writeCache } from "@/lib/offline/cache";
import { withOfflineQueue } from "@/lib/offline/mutate";
import { offlineHandlers, type MessageDeletePayload, type MessagePostPayload } from "@/lib/offline/handlers";

export type Message = {
  profile_id: string;
  content: string;
  updated_at: string;
};

export function useMessages() {
  const { profile } = useProfile();
  const familyId = profile?.family_id;
  const instanceId = useId();
  const cacheKey = familyId ? `messages:${familyId}` : null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!familyId) return;
    const { data, error } = await supabase.from("messages").select("*").order("updated_at", { ascending: false });
    if (error) return;
    setMessages(data ?? []);
    if (cacheKey) writeCache(cacheKey, data ?? []);
  }, [familyId, cacheKey]);

  useEffect(() => {
    setIsLoading(true);
    let cancelled = false;
    (async () => {
      if (cacheKey) {
        const cached = await readCache<Message[]>(cacheKey);
        if (cached && !cancelled) setMessages(cached);
      }
      await refetch();
      if (!cancelled) setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [familyId, cacheKey, refetch]);

  useEffect(() => {
    if (!familyId) return;

    const channel = supabase
      .channel(`messages:${familyId}:${instanceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `family_id=eq.${familyId}` },
        () => refetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId, refetch, instanceId]);

  async function postMessage(content: string) {
    if (!familyId || !profile) return;
    const updatedAt = new Date().toISOString();
    setMessages((prev) => {
      const withoutMine = prev.filter((m) => m.profile_id !== profile.id);
      return [{ profile_id: profile.id, content, updated_at: updatedAt }, ...withoutMine];
    });
    const payload: MessagePostPayload = { profileId: profile.id, familyId, content, updatedAt };
    await withOfflineQueue("messages:post", payload, () => offlineHandlers["messages:post"](payload));
  }

  async function deleteMessage(targetProfileId: string) {
    setMessages((prev) => prev.filter((m) => m.profile_id !== targetProfileId));
    const payload: MessageDeletePayload = { profileId: targetProfileId };
    await withOfflineQueue("messages:delete", payload, () => offlineHandlers["messages:delete"](payload));
  }

  return { messages, isLoading, postMessage, deleteMessage, refetch };
}
