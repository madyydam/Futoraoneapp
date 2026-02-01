import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useUnreadMessages = (userId: string | undefined) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchUnreadCount = async () => {
      // Get all conversations the user is part of
      const { data: participations } = await supabase
        .from("conversation_participants")
        .select("conversation_id, last_read_at")
        .eq("user_id", userId);

      if (!participations || participations.length === 0) {
        setUnreadCount(0);
        return;
      }

      // Count unread messages for each conversation in parallel
      const unreadCounts = await Promise.all(
        participations.map(async (participation) => {
          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", participation.conversation_id)
            .neq("sender_id", userId)
            .gt("created_at", participation.last_read_at || "1970-01-01");

          return count || 0;
        })
      );

      const totalUnread = unreadCounts.reduce((acc, curr) => acc + curr, 0);
      setUnreadCount(totalUnread);
    };

    fetchUnreadCount();

    // Debounced update function
    const debouncedFetch = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        fetchUnreadCount();
      }, 2000); // Wait 2 seconds before refreshing
    };

    // Subscribe to new messages
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => {
          debouncedFetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_participants',
          filter: userId ? `user_id=eq.${userId}` : undefined
        },
        () => {
          debouncedFetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [userId]);

  return unreadCount;
};

