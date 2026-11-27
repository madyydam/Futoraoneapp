import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export const useTypingIndicator = (conversationId: string, userId: string | undefined) => {
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const channelRef = useRef<RealtimeChannel | null>(null);
    const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
    const myTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!conversationId || !userId) return;

        // Join the conversation channel
        channelRef.current = supabase.channel(`conversation:${conversationId}`);

        channelRef.current
            .on('broadcast', { event: 'typing' }, (payload) => {
                const { userId: typerId } = payload.payload;
                if (typerId === userId) return; // Ignore own typing events

                // Add user to typing list if not already there
                setTypingUsers((prev) => {
                    if (!prev.includes(typerId)) return [...prev, typerId];
                    return prev;
                });

                // Clear existing timeout for this user
                if (typingTimeoutRef.current[typerId]) {
                    clearTimeout(typingTimeoutRef.current[typerId]);
                }

                // Remove user after 3 seconds of no updates
                typingTimeoutRef.current[typerId] = setTimeout(() => {
                    setTypingUsers((prev) => prev.filter((id) => id !== typerId));
                }, 3000);
            })
            .on('broadcast', { event: 'typing_stop' }, (payload) => {
                const { userId: typerId } = payload.payload;
                setTypingUsers((prev) => prev.filter((id) => id !== typerId));
                if (typingTimeoutRef.current[typerId]) {
                    clearTimeout(typingTimeoutRef.current[typerId]);
                    delete typingTimeoutRef.current[typerId];
                }
            })
            .subscribe();

        return () => {
            if (channelRef.current) supabase.removeChannel(channelRef.current);
            Object.values(typingTimeoutRef.current).forEach((t) => clearTimeout(t));
            typingTimeoutRef.current = {};
            if (myTypingTimeoutRef.current) {
                clearTimeout(myTypingTimeoutRef.current);
                myTypingTimeoutRef.current = null;
            }
        };
    }, [conversationId, userId]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && channelRef.current && userId) {
                // Broadcast typing stopped immediately on screen lock or tab switch
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'typing_stop',
                    payload: { userId },
                });
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [userId]);

    const broadcastTyping = useCallback(() => {
        if (!channelRef.current || !userId) return;

        // Limit how often we send the event to avoid flooding
        if (!myTypingTimeoutRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'typing',
                payload: { userId },
            });

            myTypingTimeoutRef.current = setTimeout(() => {
                myTypingTimeoutRef.current = null;
            }, 2000); // 2 second throttle
        }
    }, [userId]);

    return { typingUsers, broadcastTyping };
};
