import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface OnlineUser {
    user_id: string;
    profiles: {
        id: string;
        username: string;
        full_name: string;
        avatar_url: string | null;
    };
}

export const ActiveUsersList = ({ currentUserId }: { currentUserId: string }) => {
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchOnlineUsers();

        // Subscribe to presence changes global
        const channel = supabase
            .channel('global-presence-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'user_presence' },
                () => fetchOnlineUsers()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchOnlineUsers = async () => {
        const { data: presenceData, error } = await supabase
            .from("user_presence")
            .select("user_id")
            .eq("is_online", true)
            .neq("user_id", currentUserId)
            .limit(20);

        if (presenceData && presenceData.length > 0) {
            const uids = presenceData.map(p => p.user_id);
            const { data: profilesData } = await supabase
                .from("profiles")
                .select("id, username, full_name, avatar_url")
                .in("id", uids);

            setOnlineUsers(presenceData.map(p => ({
                user_id: p.user_id,
                profiles: profilesData?.find(prof => prof.id === p.user_id)
            })) as any);
        } else {
            setOnlineUsers([]);
        }
    };

    if (onlineUsers.length === 0) return null;

    return (
        <div className="mb-6">
            <h3 className="px-1 text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Active Now
            </h3>
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex w-max space-x-4 p-1">
                    {onlineUsers.map((user, i) => (
                        <motion.div
                            key={user.user_id}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex flex-col items-center gap-2 cursor-pointer group"
                            onClick={() => navigate(`/user/${user.profiles.id}`)}
                        >
                            <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-green-400 to-green-600 group-hover:scale-110 transition-transform duration-300">
                                <Avatar className="w-14 h-14 border-2 border-background">
                                    <AvatarImage src={user.profiles.avatar_url || undefined} />
                                    <AvatarFallback>{user.profiles.username[0]}</AvatarFallback>
                                </Avatar>
                                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-[3px] border-background rounded-full z-10" />
                            </div>
                            <span className="text-xs font-medium max-w-[60px] truncate">
                                {user.profiles.full_name.split(' ')[0]}
                            </span>
                        </motion.div>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" className="invisible" />
            </ScrollArea>
        </div>
    );
};
