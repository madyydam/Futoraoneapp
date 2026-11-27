import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useUnreadMessages = (userId: string | undefined) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }

    try {
      const { data, error } = await (supabase.rpc as any)("get_my_conversations_summary");
      if (error || !Array.isArray(data)) return;
      const total = data.reduce(
        (acc: number, row: { unread_count?: number }) => acc + Number(row.unread_count || 0),
        0
      );
      setUnreadCount(total);
    } catch {
      // Ignore transient offline errors
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    fetchUnreadCount();

    const syncFetch = () => {
      fetchUnreadCount();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        fetchUnreadCount();
      }, 400);
    };

    window.addEventListener("futora:reconnected", syncFetch);

    const channel = supabase
      .channel(`unread-messages-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => syncFetch()
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversation_participants",
          filter: `user_id=eq.${userId}`,
        },
        () => syncFetch()
      )
      .subscribe();

    return () => {
      window.removeEventListener("futora:reconnected", syncFetch);
      supabase.removeChannel(channel);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [userId, fetchUnreadCount]);

  return unreadCount;
};
