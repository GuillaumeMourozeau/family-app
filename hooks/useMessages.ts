import { useCallback, useEffect, useId, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";

export type Message = {
  profile_id: string;
  content: string;
  updated_at: string;
};

export function useMessages() {
  const { profile } = useProfile();
  const familyId = profile?.family_id;
  const instanceId = useId();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!familyId) return;
    const { data } = await supabase.from("messages").select("*").order("updated_at", { ascending: false });
    setMessages(data ?? []);
    setIsLoading(false);
  }, [familyId]);

  useEffect(() => {
    setIsLoading(true);
    refetch();

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
    setMessages((prev) => {
      const withoutMine = prev.filter((m) => m.profile_id !== profile.id);
      return [{ profile_id: profile.id, content, updated_at: new Date().toISOString() }, ...withoutMine];
    });
    await supabase
      .from("messages")
      .upsert({ profile_id: profile.id, family_id: familyId, content, updated_at: new Date().toISOString() });
  }

  async function deleteMessage(targetProfileId: string) {
    setMessages((prev) => prev.filter((m) => m.profile_id !== targetProfileId));
    const { error } = await supabase.from("messages").delete().eq("profile_id", targetProfileId);
    if (error) refetch();
  }

  return { messages, isLoading, postMessage, deleteMessage, refetch };
}
