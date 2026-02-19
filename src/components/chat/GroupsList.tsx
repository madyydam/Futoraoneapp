import React, { useEffect, useState, useCallback, useMemo, memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
    Users, Lock, Globe, Crown, BadgeCheck,
    Zap, Clock, Search, ChevronRight, ArrowUpRight
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────

type GroupRole = 'admin' | 'member' | null;

interface GroupItem {
    id: string;
    name: string;
    description: string;
    avatar_url: string | null;
    is_public: boolean;
    is_verified: boolean;
    member_count: number;
    unread_count: number;
    last_message: string | null;
    last_active: string;
    role: GroupRole;        // null = not a member
    created_by: string;
}

interface GroupsListProps {
    currentUserId: string;
    searchQuery?: string;
}

// ─── Role Badge ──────────────────────────────────────────────────────────────

const RoleBadge = memo(({ role, isCreator }: { role: GroupRole; isCreator: boolean }) => {
    if (!role) return null;
    if (role === 'admin' || isCreator) return (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50">
            <Crown className="w-2.5 h-2.5" /> Admin
        </span>
    );
    return (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            Member
        </span>
    );
});
RoleBadge.displayName = "RoleBadge";

// ─── Group Card ──────────────────────────────────────────────────────────────

const GroupCard = memo(({ group, currentUserId, onJoin, onNavigate }: {
    group: GroupItem;
    currentUserId: string;
    onJoin: (id: string) => void;
    onNavigate: (id: string) => void;
}) => {
    const isMember = group.role !== null;
    const isCreator = group.created_by === currentUserId;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            whileHover={{ y: -1 }}
            transition={{ duration: 0.18 }}
            onClick={() => isMember && onNavigate(group.id)}
            className={`
                relative flex items-center gap-3.5 p-3.5 rounded-2xl border
                transition-all duration-200 select-none
                ${isMember
                    ? 'bg-white dark:bg-card hover:shadow-md hover:border-primary/25 border-border/50 cursor-pointer'
                    : 'bg-muted/20 dark:bg-card/40 border-border/30 cursor-default opacity-90'
                }
            `}
        >
            {/* Verified glow border */}
            {group.is_verified && (
                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-violet-400/40 pointer-events-none" />
            )}

            {/* Avatar */}
            <div className="relative flex-shrink-0">
                <Avatar className={`h-14 w-14 shadow-md ${group.is_verified ? 'ring-2 ring-violet-400 ring-offset-2 ring-offset-background' : 'ring-1 ring-border'}`}>
                    <AvatarImage src={group.avatar_url || undefined} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 via-violet-500/10 to-primary/5 text-primary font-black text-lg">
                        {group.name[0]?.toUpperCase()}
                    </AvatarFallback>
                </Avatar>

                {/* Active pulse */}
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-card" />
                </span>

                {/* Verified check */}
                {group.is_verified && (
                    <div className="absolute -top-1 -left-1 bg-violet-500 rounded-full p-0.5 border-2 border-white dark:border-card shadow">
                        <BadgeCheck className="w-2.5 h-2.5 text-white fill-white" />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                {/* Row 1: Name + Time */}
                <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className={`font-bold text-[15px] truncate leading-tight ${group.unread_count > 0 ? 'text-foreground' : 'text-foreground/90'}`}>
                            {group.name}
                        </h3>
                        {group.is_verified && (
                            <BadgeCheck className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                        )}
                    </div>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap flex-shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(group.last_active), { addSuffix: false }).replace('about ', '').replace('less than a minute', 'now')}
                    </span>
                </div>

                {/* Row 2: Last message */}
                <p className={`text-sm truncate mb-2 ${group.unread_count > 0 ? 'text-foreground/80 font-medium' : 'text-muted-foreground'}`}>
                    {group.last_message ?? <span className="italic text-muted-foreground/60 text-xs">No messages yet</span>}
                </p>

                {/* Row 3: Stats + badges */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Member count */}
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                            <Users className="w-3 h-3" />
                            {group.member_count.toLocaleString()}
                        </span>

                        {/* Privacy */}
                        <span className={`flex items-center gap-1 text-[11px] font-semibold ${group.is_public ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {group.is_public
                                ? <><Globe className="w-3 h-3" /> Public</>
                                : <><Lock className="w-3 h-3" /> Private</>
                            }
                        </span>

                        {/* Role badge */}
                        <RoleBadge role={group.role} isCreator={isCreator} />
                    </div>

                    {/* Right side: Unread OR Join button */}
                    {isMember ? (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            {group.unread_count > 0 && (
                                <span className="min-w-[20px] h-5 px-1.5 text-[10px] font-black bg-primary text-white rounded-full flex items-center justify-center shadow-sm animate-in zoom-in">
                                    {group.unread_count > 99 ? '99+' : group.unread_count}
                                </span>
                            )}
                            <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                        </div>
                    ) : (
                        <Button
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); onJoin(group.id); }}
                            className="h-7 px-4 text-[11px] font-bold rounded-full bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90 text-white shadow-sm flex items-center gap-1"
                        >
                            Join <ArrowUpRight className="w-3 h-3" />
                        </Button>
                    )}
                </div>
            </div>
        </motion.div>
    );
});
GroupCard.displayName = "GroupCard";

// ─── Skeleton Loader ─────────────────────────────────────────────────────────

const GroupCardSkeleton = () => (
    <div className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-border/30 bg-card/30 animate-pulse">
        <div className="h-14 w-14 rounded-full bg-muted flex-shrink-0" />
        <div className="flex-1 space-y-2 min-w-0">
            <div className="flex items-center justify-between">
                <div className="h-4 bg-muted rounded-lg w-1/3" />
                <div className="h-3 bg-muted rounded w-12" />
            </div>
            <div className="h-3 bg-muted rounded-lg w-2/3" />
            <div className="flex gap-2">
                <div className="h-3 bg-muted rounded w-16" />
                <div className="h-3 bg-muted rounded w-12" />
            </div>
        </div>
    </div>
);

// ─── Section Header ───────────────────────────────────────────────────────────

const SectionHeader = ({ color, label, count }: { color: string; label: string; count: number }) => (
    <div className="flex items-center gap-2 px-0.5 mb-2 mt-1">
        <div className={`w-1 h-5 rounded-full ${color}`} />
        <span className="text-[11px] font-black uppercase tracking-widest text-foreground/50">{label}</span>
        <span className="ml-auto text-[11px] font-bold text-muted-foreground bg-muted rounded-full px-2 py-0.5">{count}</span>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export function GroupsList({ currentUserId, searchQuery = '' }: GroupsListProps) {
    const [groups, setGroups] = useState<GroupItem[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchGroups = useCallback(async () => {
        if (!currentUserId) return;
        try {
            // 1. Get all groups user is member of (with role)
            const { data: memberships } = await supabase
                .from('group_members')
                .select('group_id, role')
                .eq('user_id', currentUserId);

            const membershipMap: Record<string, GroupRole> = {};
            (memberships || []).forEach((m: any) => {
                membershipMap[m.group_id] = m.role;
            });

            const joinedIds = Object.keys(membershipMap);

            // 2. Fetch all visible groups (public + joined)
            let query = supabase
                .from('groups')
                .select('id, name, description, avatar_url, is_public, created_by, created_at, updated_at')
                .order('updated_at', { ascending: false });

            const { data: groupsData, error } = await query;
            if (error) throw error;

            // Filter: show public groups + groups user has joined
            const visibleGroups = (groupsData || []).filter(
                (g: any) => g.is_public || joinedIds.includes(g.id)
            );

            if (visibleGroups.length === 0) {
                setGroups([]);
                return;
            }

            const groupIds = visibleGroups.map((g: any) => g.id);

            // 3. Member counts per group
            const memberCountPromises = groupIds.map(id =>
                supabase
                    .from('group_members')
                    .select('*', { count: 'exact', head: true })
                    .eq('group_id', id)
            );

            // 4. Last message per group
            const lastMsgPromises = groupIds.map(id =>
                supabase
                    .from('messages')
                    .select('content, created_at')
                    .eq('group_id', id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()
            );

            // 5. Unread counts per group (only for joined groups)
            const unreadPromises = groupIds.map(id =>
                joinedIds.includes(id)
                    ? supabase
                        .from('messages')
                        .select('*', { count: 'exact', head: true })
                        .eq('group_id', id)
                        .eq('is_read', false)
                        .neq('sender_id', currentUserId)
                    : Promise.resolve({ count: 0 })
            );

            const [memberCounts, lastMsgs, unreadCounts] = await Promise.all([
                Promise.all(memberCountPromises),
                Promise.all(lastMsgPromises),
                Promise.all(unreadPromises),
            ]);

            const enriched: GroupItem[] = visibleGroups.map((g: any, i: number) => ({
                id: g.id,
                name: g.name,
                description: g.description || '',
                avatar_url: g.avatar_url,
                is_public: g.is_public,
                is_verified: (g as any).is_verified ?? false,
                member_count: memberCounts[i]?.count ?? 0,
                unread_count: unreadCounts[i]?.count ?? 0,
                last_message: lastMsgs[i]?.data?.content ?? null,
                last_active: lastMsgs[i]?.data?.created_at ?? g.updated_at,
                role: membershipMap[g.id] ?? null,
                created_by: g.created_by,
            }));

            // Sort: joined groups first by last active, then discover
            enriched.sort((a, b) => {
                if (a.role && !b.role) return -1;
                if (!a.role && b.role) return 1;
                return new Date(b.last_active).getTime() - new Date(a.last_active).getTime();
            });

            setGroups(enriched);
        } catch (err) {
            console.error('Error fetching groups:', err);
            toast.error('Failed to load groups');
        } finally {
            setLoading(false);
        }
    }, [currentUserId]);

    useEffect(() => {
        fetchGroups();

        const channel = supabase.channel('groups_list_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, fetchGroups)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, fetchGroups)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members', filter: `user_id=eq.${currentUserId}` }, fetchGroups)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [currentUserId, fetchGroups]);

    const handleJoin = useCallback(async (groupId: string) => {
        const { error } = await supabase
            .from('group_members')
            .insert({ group_id: groupId, user_id: currentUserId, role: 'member' });

        if (error) {
            toast.error('Failed to join group');
        } else {
            toast.success('You joined the group! 🎉');
            fetchGroups();
        }
    }, [currentUserId, fetchGroups]);

    const handleNavigate = useCallback((id: string) => {
        navigate(`/messages/group/${id}`);
    }, [navigate]);

    // Filter by search
    const filtered = useMemo(() =>
        searchQuery.trim()
            ? groups.filter(g =>
                g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                g.description.toLowerCase().includes(searchQuery.toLowerCase())
            )
            : groups,
        [groups, searchQuery]
    );

    const myGroups = useMemo(() => filtered.filter(g => g.role !== null), [filtered]);
    const discoverGroups = useMemo(() => filtered.filter(g => g.role === null), [filtered]);

    // ── Skeletons
    if (loading) {
        return (
            <div className="space-y-2.5 mt-2">
                {[1, 2, 3, 4].map(i => <GroupCardSkeleton key={i} />)}
            </div>
        );
    }

    // ── Empty
    if (groups.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-16 text-center px-6"
            >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-violet-500/10 flex items-center justify-center mb-4 shadow-inner">
                    <Users className="w-9 h-9 text-primary/30" />
                </div>
                <h3 className="font-bold text-lg text-foreground/80 mb-1">No groups yet</h3>
                <p className="text-sm text-muted-foreground">Create or join a group to get started!</p>
            </motion.div>
        );
    }

    return (
        <div className="space-y-5 pb-24">
            {/* My Groups */}
            {myGroups.length > 0 && (
                <div>
                    <SectionHeader color="bg-primary" label="My Groups" count={myGroups.length} />
                    <div className="space-y-2">
                        <AnimatePresence initial={false}>
                            {myGroups.map(group => (
                                <GroupCard
                                    key={group.id}
                                    group={group}
                                    currentUserId={currentUserId}
                                    onJoin={handleJoin}
                                    onNavigate={handleNavigate}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {/* Discover */}
            {discoverGroups.length > 0 && (
                <div>
                    <SectionHeader color="bg-violet-500" label="Discover" count={discoverGroups.length} />
                    <div className="space-y-2">
                        <AnimatePresence initial={false}>
                            {discoverGroups.map(group => (
                                <GroupCard
                                    key={group.id}
                                    group={group}
                                    currentUserId={currentUserId}
                                    onJoin={handleJoin}
                                    onNavigate={handleNavigate}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {/* No results for search */}
            {filtered.length === 0 && searchQuery && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center py-12 text-center"
                >
                    <Search className="w-8 h-8 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No groups match "<strong>{searchQuery}</strong>"</p>
                </motion.div>
            )}
        </div>
    );
}
