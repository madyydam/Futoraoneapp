import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { RealtimeChannel } from "@supabase/supabase-js";

interface UserPresence {
    is_online: boolean;
    last_seen: string;
}

interface UserPresenceContextType {
    onlineUsers: Record<string, UserPresence>;
}

const UserPresenceContext = createContext<UserPresenceContextType | undefined>(undefined);

export const UserPresenceProvider = ({ children }: { children: ReactNode }) => {
    const [onlineUsers, setOnlineUsers] = useState<Record<string, UserPresence>>({});

    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        // Check for session immediately
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        let mounted = true;
        const mainChannel = supabase.channel("global-presence");

        const setupSubscription = async () => {
            // Presence system disabled for now
        };

        setupSubscription();

        return () => {
            mounted = false;
            console.log("Cleaning up presence channel");
            supabase.removeChannel(mainChannel);
        };
    }, [user]);

    // Use a separate effect to handle the CURRENT user's heartbeat
    useEffect(() => {
        if (!user) return; // Wait for user

        let interval: NodeJS.Timeout;
        let mounted = true;

        const updatePresence = async (isOnline: boolean) => {
            if (!user || !mounted) return;
            const timestamp = new Date().toISOString();

            // Upsert is cleaner than check-then-update
            const { error } = await supabase
                .from("user_presence")
                .upsert({
                    user_id: user.id,
                    is_online: isOnline,
                    last_seen: timestamp
                }, { onConflict: 'user_id' });

            if (error) {
                console.error("Error updating presence:", error);
            }
        };

        const setupHeartbeat = async () => {
            // Heartbeat disabled for now
        };

        setupHeartbeat();

        return () => {
            mounted = false;
            if (interval) clearInterval(interval);

            // Try to set offline on unmount - best effort
            if (user) {
                // We don't await this because we are unmounting
                supabase.from("user_presence").upsert({
                    user_id: user.id,
                    is_online: false,
                    last_seen: new Date().toISOString()
                }).then(({ error }) => {
                    if (error) console.error("Error setting offline:", error);
                });
            }
        };
    }, [user]);

    const value = useMemo(() => ({ onlineUsers }), [onlineUsers]);

    return (
        <UserPresenceContext.Provider value={value}>
            {children}
        </UserPresenceContext.Provider>
    );
};

export const useUserPresenceContext = () => {
    const context = useContext(UserPresenceContext);
    if (context === undefined) {
        throw new Error("useUserPresenceContext must be used within a UserPresenceProvider");
    }
    return context;
};
