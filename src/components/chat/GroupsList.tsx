import React, { useEffect, useState, useCallback, memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { Users, MoreHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Group {
    id: string;
    name: string;
    description: string;
    avatar_url: string | null;
    is_public: boolean;
    member_count: number;
    last_active: string;
    status: 'open' | 'join';
}

interface GroupsListProps {
    currentUserId: string;
}

const GroupCard = memo(({
    group,
    onJoin,
    onNavigate
}: {
    group: Group;
    onJoin: (id: string) => void;
    onNavigate: (id: string) => void;
}) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
    >
        <Card
            className="border border-border/40 shadow-sm hover:shadow-md transition-all cursor-pointer bg-white dark:bg-card/50 overflow-hidden"
            onClick={() => group.status === 'open' && onNavigate(group.id)}
        >
            <CardContent className="p-4">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Avatar className="h-14 w-14 border-2 border-background shadow-sm">
                            <AvatarImage src={group.avatar_url || undefined} className="object-cover" />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">{group.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="absolute top-0.5 right-0.5 w-3 h-3 bg-yellow-400 border-2 border-background rounded-full" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="font-bold text-[15px] truncate">{group.name}</h3>
                            {group.status === 'join' ? (
                                <Button
                                    size="sm"
                                    className="bg-primary hover:bg-primary/90 text-white h-8 px-4"
                                    onClick={(e) => { e.stopPropagation(); onJoin(group.id); }}
                                >Join</Button>
                            ) : (
                                <Button variant="secondary" size="sm" className="h-8 px-4">Open</Button>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-[12px] text-muted-foreground mb-1">
                            <span className="font-medium">{group.member_count} members</span>
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(group.last_active), { addSuffix: false }).replace('about ', '')} ago</span>
                        </div>
                        <p className="text-sm text-muted-foreground/80 truncate">{group.description}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    </motion.div>
));

GroupCard.displayName = "GroupCard";

export function GroupsList({ currentUserId }: GroupsListProps) {
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchGroups = useCallback(async () => {
        if (!currentUserId) return;

        try {
            // Get user membership
            const { data: memberData } = await supabase
                .from('group_members')
                .select('group_id')
                .eq('user_id', currentUserId);

            const joinedGroupIds = memberData?.map((m: any) => m.group_id) || [];

            // Fetch public groups or groups user joined
            const { data: groupsData, error } = await supabase
                .from('groups')
                .select(`
                    *,
                    group_members(count)
                `)
                .order('updated_at', { ascending: false });

            if (error) throw error;

            // Get last message previews
            const lastMsgsPromises = (groupsData || []).map(g =>
                supabase
                    .from('messages')
                    .select('content, created_at, sender_id')
                    .eq('group_id', g.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()
            );

            const lastMsgs = await Promise.all(lastMsgsPromises);

            const enriched = (groupsData || []).map((g: any, i: number) => ({
                id: g.id,
                name: g.name,
                description: lastMsgs[i]?.data?.content || g.description || 'No messages yet',
                avatar_url: g.avatar_url,
                is_public: g.is_public,
                member_count: g.group_members?.[0]?.count || 0,
                last_active: lastMsgs[i]?.data?.created_at || g.updated_at,
                status: joinedGroupIds.includes(g.id) ? 'open' : 'join'
            }));

            setGroups(enriched as Group[]);
        } catch (error) {
            console.error('Error fetching groups:', error);
        } finally {
            setLoading(false);
        }
    }, [currentUserId]);

    useEffect(() => {
        fetchGroups();
        const channel = supabase.channel('realtime_groups')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchGroups())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, () => fetchGroups())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members', filter: `user_id=eq.${currentUserId}` }, () => fetchGroups())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [currentUserId, fetchGroups]);

    const handleJoin = useCallback(async (groupId: string) => {
        const { error } = await supabase.from('group_members').insert({ group_id: groupId, user_id: currentUserId });
        if (error) toast.error("Failed to join group");
        else {
            toast.success("Joined group!");
            fetchGroups();
        }
    }, [currentUserId, fetchGroups]);

    const handleNavigate = useCallback((id: string) => {
        navigate(`/messages/group/${id}`);
    }, [navigate]);

    if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading groups...</div>;

    if (groups.length === 0) {
        return (
            <div className="p-12 text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No groups available. Create one to get started!</p>
            </div>
        );
    }

    return (
        <div className="space-y-3 pb-24 px-1 mt-2">
            {groups.map((group) => (
                <GroupCard
                    key={group.id}
                    group={group}
                    onJoin={handleJoin}
                    onNavigate={handleNavigate}
                />
            ))}
        </div>
    );
}
