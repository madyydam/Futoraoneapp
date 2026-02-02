import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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
            // Only subscribe if user is logged in
            if (!user) return;

            // Subscribe to ALL changes in user_presence table
            // This reduces the number of WebSocket connections to 1, instead of N per user card.
            console.log("Initializing presence channel for user:", user.id);

            mainChannel
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "user_presence",
                    },
                    (payload) => {
                        if (!mounted) return;
                        if (payload.new) {
                            // Define shape for safe casting
                            interface PresencePayload {
                                user_id: string;
                                is_online: boolean;
                                last_seen: string;
                            }
                            const newData = payload.new as unknown as PresencePayload;
                            const userId = newData.user_id;

                            setOnlineUsers((prev) => {
                                // Optimization: Only update if data actually changed
                                const existing = prev[userId];
                                if (existing && existing.is_online === newData.is_online && existing.last_seen === newData.last_seen) {
                                    return prev;
                                }
                                return {
                                    ...prev,
                                    [userId]: {
                                        is_online: newData.is_online,
                                        last_seen: newData.last_seen,
                                    },
                                };
                            });
                        }
                    }
                )
                .subscribe((status) => {
                    if (!mounted) return;
                    if (status === "SUBSCRIBED") {
                        console.log("Connected to presence channel");
                    } else if (status === "CHANNEL_ERROR") {
                        console.error("Failed to connect to presence channel. Check Supabase RLS policies and API keys.");
                    } else if (status === "TIMED_OUT") {
                        console.error("Connection to presence channel timed out - retrying...");
                    }
                });
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
            // Initial online set
            await updatePresence(true);

            // Heartbeat every 30 seconds
            if (mounted) {
                interval = setInterval(() => {
                    updatePresence(true);
                }, 30000);
            }
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

    return (
        <UserPresenceContext.Provider value={{ onlineUsers }}>
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
