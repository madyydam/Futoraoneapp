import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";

export type BroadcastPopupData = {
    id: string;
    title: string | null;
    message: string;
    type: string;
    audience: string;
    created_at: string;
};

export const useBroadcastPopup = () => {
    const [popup, setPopup] = useState<BroadcastPopupData | null>(null);
    const location = useLocation();

    const fetchLatestUnseenPopup = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get user's signup date
            const { data: profile } = await supabase
                .from('profiles')
                .select('created_at')
                .eq('id', user.id)
                .single();

            if (!profile) return;

            // Fetch the latest active popup that:
            // 1. Was created AFTER the user's signup
            // 2. Has NOT been seen by the user
            // 3. Is currently active
            // 4. Has not expired (if expires_at is set)

            const { data: seenPopups } = await supabase
                .from('user_popup_status')
                .select('popup_id')
                .eq('user_id', user.id);

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
    };

    const markAsSeen = async (popupId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await supabase
                .from('user_popup_status')
                .insert([{ user_id: user.id, popup_id: popupId }]);

            setPopup(null);
        } catch (error) {
            console.error("Error marking popup as seen:", error);
        }
    };

    const isNewUser = (createdAt: string) => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return new Date(createdAt) > thirtyDaysAgo;
    };

    useEffect(() => {
        // Initial fetch
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
                    const isProtectedPage =
                        location.pathname.includes('/auth') ||
                        location.pathname.includes('/wallet') ||
                        location.pathname.includes('/admin');

                    if (!isProtectedPage && newPopup.is_active) {
                        setPopup(newPopup);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [location.pathname]);

    return { popup, markAsSeen };
};
