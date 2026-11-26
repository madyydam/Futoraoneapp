import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export type BroadcastPopupData = {
    id: string;
    title: string | null;
    message: string;
    type: string;
    audience: string;
    created_at: string;
    is_active?: boolean;
};

const isNewUser = (createdAt: string) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return new Date(createdAt) > thirtyDaysAgo;
};

export const useBroadcastPopup = () => {
    const [popup, setPopup] = useState<BroadcastPopupData | null>(null);
    const location = useLocation();
    const { userId } = useAuth();
    const pathnameRef = useRef(location.pathname);

    useEffect(() => {
        pathnameRef.current = location.pathname;
    }, [location.pathname]);

    const fetchLatestUnseenPopup = useCallback(async () => {
        if (!userId) {
            setPopup(null);
            return;
        }
        try {
            // Get user's signup date safely
            const { data: profile } = await supabase
                .from('profiles')
                .select('created_at')
                .eq('id', userId)
                .maybeSingle();

            if (!profile) return;

            const { data: seenPopups } = await supabase
                .from('user_popup_status')
                .select('popup_id')
                .eq('user_id', userId);

            const seenIds = seenPopups?.map(s => s.popup_id) || [];

            let query = supabase
                .from('broadcast_messages')
                .select('*')
                .eq('is_active', true)
                .gt('created_at', profile.created_at)
                .order('created_at', { ascending: false })
                .limit(1);

            if (seenIds.length > 0) {
                query = query.not('id', 'in', `(${seenIds.join(',')})`);
            }

            const { data: messages, error } = await query;

            if (error) throw error;

            if (messages && messages.length > 0) {
                const latestPopup = messages[0];

                // Check audience targeting
                const isTargeted =
                    latestPopup.audience === 'all' ||
                    (latestPopup.audience === 'new_users' && isNewUser(profile.created_at)) ||
                    (latestPopup.audience === 'existing_users' && !isNewUser(profile.created_at));

                if (isTargeted) {
                    setPopup(latestPopup);
                }
            }
        } catch (error) {
            console.error("Error fetching broadcast popup:", error);
        }
    }, [userId]);

    const markAsSeen = useCallback(async (popupId: string) => {
        if (!userId) return;
        try {
            await supabase
                .from('user_popup_status')
                .insert([{ user_id: userId, popup_id: popupId }]);

            setPopup(null);
        } catch (error) {
            console.error("Error marking popup as seen:", error);
        }
    }, [userId]);

    useEffect(() => {
        if (!userId) return;

        // Initial fetch (once per user session instead of re-fetching on every route change)
        fetchLatestUnseenPopup();

        // Subscribe to real-time broadcasts
        const channel = supabase
            .channel('broadcast-popups')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'broadcast_messages' },
                (payload) => {
                    const newPopup = payload.new as BroadcastPopupData;
                    // Check if user is on a protected route (payment, auth)
                    const currentPath = pathnameRef.current;
                    const isProtectedPage =
                        currentPath.includes('/auth') ||
                        currentPath.includes('/wallet') ||
                        currentPath.includes('/admin');

                    if (!isProtectedPage && newPopup.is_active) {
                        setPopup(newPopup);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, fetchLatestUnseenPopup]);

    return { popup, markAsSeen };
};
