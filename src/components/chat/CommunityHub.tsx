import { useState, useEffect, useCallback, useMemo, memo } from "react";
import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Search, ShieldCheck, Shield, Users, Hash, Crown,
    MoreVertical, UserMinus, ArrowUpCircle, ArrowDownCircle,
    User, SearchX
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
    AlertDialog, AlertDialogTrigger, AlertDialogContent,
    AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
    AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
    id: string;
    user_id: string;
    role: "admin" | "moderator" | "member";
    joined_at: string;
    profiles: { username: string; full_name: string; avatar_url: string; bio: string };
}

// ─── Role Badge ───────────────────────────────────────────────────────────────

const RoleBadge = memo(({ role, isCreator, compact }: { role: string; isCreator?: boolean; compact?: boolean }) => {
    if (isCreator) return (
        <span className={`inline-flex items-center gap-1 font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 rounded-full border border-amber-200 dark:border-amber-700/40 ${compact ? 'text-[8px] px-1 py-0' : 'text-[10px] px-2 py-0.5'}`}>
            <Crown className={`${compact ? 'w-2 h-2' : 'w-2.5 h-2.5'}`} /> Creator
        </span>
    );
    if (role === "admin") return (
        <span className={`inline-flex items-center gap-1 font-black text-primary bg-primary/10 rounded-full border border-primary/20 ${compact ? 'text-[8px] px-1 py-0' : 'text-[10px] px-2 py-0.5'}`}>
            <ShieldCheck className={`${compact ? 'w-2 h-2' : 'w-2.5 h-2.5'}`} /> Admin
        </span>
    );
    if (role === "moderator") return (
        <span className={`inline-flex items-center gap-1 font-black text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded-full border border-blue-200/60 ${compact ? 'text-[8px] px-1 py-0' : 'text-[10px] px-2 py-0.5'}`}>
            <Shield className={`${compact ? 'w-2 h-2' : 'w-2.5 h-2.5'}`} /> Mod
        </span>
    );
    return null;
});
RoleBadge.displayName = "RoleBadge";

// ─── Member Card ──────────────────────────────────────────────────────────────

const MemberCardItem = memo(({
    member, currentUserId, isAdmin, communityCreatorId, onRoleChange, onRemove, isSidebar
}: {
    member: Member;
    currentUserId: string;
    isAdmin: boolean;
    communityCreatorId: string;
    onRoleChange: (userId: string, newRole: "admin" | "moderator" | "member") => Promise<void>;
    onRemove: (userId: string) => Promise<void>;
    isSidebar?: boolean;
}) => {
    const isMe = member.user_id === currentUserId;
    const isCreator = member.user_id === communityCreatorId;
    const canManage = isAdmin && !isMe && !isCreator;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`flex items-center gap-3 group transition-all rounded-xl ${isSidebar ? 'hover:bg-muted/30 px-2 py-1.5' : 'py-3.5 px-1 border-b border-border/10 last:border-0'
                }`}
        >
            {/* Avatar with Status */}
            <div className="relative flex-shrink-0">
                <Avatar className={`${isSidebar ? 'h-8 w-8' : 'h-11 w-11'} ring-1 ring-border/40 shadow-sm transition-transform group-hover:scale-105`}>
                    <AvatarImage src={member.profiles.avatar_url} className="object-cover" />
                    <AvatarFallback className="bg-primary/5 text-primary font-black text-xs">
                        {member.profiles.full_name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                {isSidebar && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-background" />
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 overflow-hidden">
                    <p className={`font-bold truncate tracking-tight ${isSidebar ? 'text-xs text-foreground/80' : 'text-sm'}`}>
                        {member.profiles.full_name}
                    </p>
                    {isSidebar && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <RoleBadge role={member.role} isCreator={isCreator} compact={true} />
                        </div>
                    )}
                </div>
                {!isSidebar && (
                    <>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <RoleBadge role={member.role} isCreator={isCreator} />
                            {isMe && <span className="text-[10px] text-muted-foreground/40 font-black uppercase">You</span>}
                        </div>
                        <p className="text-[11px] text-muted-foreground/70 truncate mt-1">
                            {member.profiles.bio || `@${member.profiles.username}`}
                        </p>
                    </>
                )}
                {isSidebar && isMe && !isCreator && (
                    <p className="text-[9px] text-primary/40 font-black uppercase tracking-tighter">You</p>
                )}
            </div>

            {/* Admin actions */}
            {canManage && (
                <div className={`${isSidebar ? 'opacity-0 active:opacity-100 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity flex-shrink-0`}>
                    <AlertDialog>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`${isSidebar ? 'h-6 w-6' : 'h-8 w-8'} rounded-lg hover:bg-primary/10`}
                                >
                                    <MoreVertical className={`${isSidebar ? 'w-3 h-3' : 'w-4 h-4'} text-muted-foreground`} />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-2xl shadow-xl p-1 overflow-hidden">
                                <p className="px-3 py-1.5 text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">Management</p>
                                {member.role === "member" && (
                                    <DropdownMenuItem className="gap-2 rounded-xl text-blue-500 focus:text-blue-500" onClick={() => onRoleChange(member.user_id, "moderator")}>
                                        <ArrowUpCircle className="w-4 h-4" /> Make Moderator
                                    </DropdownMenuItem>
                                )}
                                {member.role === "moderator" && (
                                    <>
                                        <DropdownMenuItem className="gap-2 rounded-xl text-primary focus:text-primary" onClick={() => onRoleChange(member.user_id, "admin")}>
                                            <ShieldCheck className="w-4 h-4" /> Make Admin
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="gap-2 rounded-xl" onClick={() => onRoleChange(member.user_id, "member")}>
                                            <ArrowDownCircle className="w-4 h-4" /> Demote to Member
                                        </DropdownMenuItem>
                                    </>
                                )}
                                {member.role === "admin" && (
                                    <DropdownMenuItem className="gap-2 rounded-xl" onClick={() => onRoleChange(member.user_id, "member")}>
                                        <ArrowDownCircle className="w-4 h-4" /> Demote to Member
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator className="bg-border/40" />
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem className="gap-2 rounded-xl text-destructive focus:text-destructive focus:bg-destructive/10">
                                        <UserMinus className="w-4 h-4" /> Remove from Squad
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <AlertDialogContent className="max-w-[340px] rounded-[24px] border-border/40">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="font-black text-xl tracking-tighter">Remove Member?</AlertDialogTitle>
                                <AlertDialogDescription className="text-sm font-medium">
                                    Are you sure you want to remove <span className="text-foreground font-black">{member.profiles.full_name}</span>?
                                    They will lose access to all channels instantly.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2">
                                <AlertDialogCancel className="rounded-xl border-border/40 font-bold">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    className="rounded-xl bg-destructive hover:bg-destructive/90 font-black"
                                    onClick={() => onRemove(member.user_id)}
                                >
                                    Confirm Removal
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            )}
        </motion.div>
    );
});
MemberCardItem.displayName = "MemberCardItem";

// ─── Stats Card ───────────────────────────────────────────────────────────────

const StatCardItem = memo(({ icon: Icon, value, label, color }: {
    icon: React.ElementType;
    value: number;
    label: string;
    color: string;
}) => (
    <div className={`flex-1 rounded-[20px] border p-3 flex flex-col items-start gap-1 transition-all hover:scale-105 hover:shadow-sm ${color}`}>
        <Icon className="w-4 h-4 opacity-40" />
        <div className="flex flex-col">
            <p className="text-xl font-black leading-none tracking-tighter">{value}</p>
            <p className="text-[9px] font-black opacity-60 uppercase tracking-[0.1em] mt-1">{label}</p>
        </div>
    </div>
));
StatCardItem.displayName = "StatCardItem";

// ─── Main Component ───────────────────────────────────────────────────────────

export function CommunityHub({
    community, currentUserId, userRole, channelCount, onOpenAdminPanel, isSidebar = false
}: {
    community: any;
    currentUserId?: string;
    userRole?: string;
    channelCount?: number;
    onOpenAdminPanel?: () => void;
    isSidebar?: boolean;
}) {
    const [members, setMembers] = useState<Member[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState("All");
    const [loading, setLoading] = useState(true);

    const isAdmin = userRole === "admin" || userRole === "moderator";

    const fetchMembers = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("community_members" as any)
                .select(`
                    id, user_id, role, joined_at,
                    profiles:user_id (username, full_name, avatar_url, bio)
                `)
                .eq("community_id", community.id)
                .order("joined_at", { ascending: true });
            if (error) throw error;
            setMembers(data as any[] || []);
        } catch (err) {
            console.error("Error fetching members:", err);
        } finally {
            setLoading(false);
        }
    }, [community.id]);

    useEffect(() => { fetchMembers(); }, [fetchMembers]);

    const filteredMembers = useMemo(() => members.filter(m => {
        const matchesSearch =
            m.profiles.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.profiles.username?.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;
        if (activeFilter === "Admins") return m.role === "admin";
        if (activeFilter === "Mods") return m.role === "moderator";
        if (activeFilter === "Members") return m.role === "member";
        return true;
    }), [members, searchQuery, activeFilter]);

    // Role Grouping for Sidebar
    const groupedMembers = useMemo(() => {
        const staff = filteredMembers.filter(m => m.role === "admin" || m.role === "moderator" || m.user_id === community.created_by);
        const regular = filteredMembers.filter(m => !staff.includes(m));
        return { staff, regular };
    }, [filteredMembers, community.created_by]);

    const handleRoleChange = useCallback(async (userId: string, newRole: "admin" | "moderator" | "member") => {
        const { error } = await supabase
            .from("community_members" as any)
            .update({ role: newRole })
            .eq("community_id", community.id)
            .eq("user_id", userId);
        if (error) { toast.error("Failed to update role"); return; }
        toast.success("Role updated");
        setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role: newRole } : m));
    }, [community.id]);

    const handleRemove = useCallback(async (userId: string) => {
        const { error } = await supabase
            .from("community_members" as any)
            .delete()
            .eq("community_id", community.id)
            .eq("user_id", userId);
        if (error) { toast.error("Failed to remove member"); return; }
        toast.success("Member removed");
        setMembers(prev => prev.filter(m => m.user_id !== userId));
    }, [community.id]);

    const FILTERS = ["All", "Admins", "Mods", "Members"];
    const adminCount = members.filter(m => m.role === "admin").length;
    const modCount = members.filter(m => m.role === "moderator").length;

    return (
        <div className={`flex flex-col h-full ${isSidebar ? 'bg-transparent' : 'bg-background'}`}>
            {/* ── Header Area ── */}
            {!isSidebar && (
                <>
                    <div className="px-6 pt-6 pb-4">
                        <h2 className="text-3xl font-black tracking-tighter flex items-center gap-2">
                            Member Directory
                            <span className="text-primary/20 text-2xl font-light">/</span>
                            <span className="text-muted-foreground/30 text-lg font-bold">{members.length}</span>
                        </h2>
                        <p className="text-muted-foreground/60 font-medium text-sm mt-1">Manage roles and explore your community squad.</p>
                    </div>

                    <div className="px-6 pb-6 flex gap-3">
                        <StatCardItem icon={Users} value={members.length} label="Total Members"
                            color="bg-primary/5 border-primary/20 text-primary shadow-sm" />
                        <StatCardItem icon={ShieldCheck} value={adminCount + modCount} label="Guardians"
                            color="bg-amber-500/5 border-amber-500/10 text-amber-600 dark:text-amber-400" />
                        <StatCardItem icon={Hash} value={channelCount || 0} label="Active Channels"
                            color="bg-violet-500/5 border-violet-500/10 text-violet-600 dark:text-violet-400" />
                    </div>
                </>
            )}

            {isSidebar && (
                <div className="px-4 py-4 border-b border-border/10 mb-4">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/50">Online Members</span>
                        <div className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black">
                            {members.length}
                        </div>
                    </div>
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/20 group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="Find member..."
                            className="pl-9 h-9 bg-card border-border/20 rounded-xl text-xs focus-visible:ring-primary/20"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            )}

            {/* ── Filters (Directory Mode Only) ── */}
            {!isSidebar && (
                <div className="px-6 pb-4 flex items-center justify-between border-b border-border/5">
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                        {FILTERS.map(f => (
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={`px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${activeFilter === f
                                    ? "bg-foreground text-background shadow-lg scale-105"
                                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-64 hidden sm:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30" />
                        <Input
                            placeholder="Search by name or @username..."
                            className="pl-10 h-10 bg-muted/30 border-border/20 rounded-full text-xs"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            )}

            {/* ── Member list ── */}
            <ScrollArea className="flex-1 px-4 lg:px-6">
                {loading ? (
                    <div className="space-y-4 py-4">
                        {[...Array(isSidebar ? 8 : 4)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3 animate-pulse">
                                <div className={`${isSidebar ? 'w-8 h-8' : 'w-11 h-11'} rounded-xl bg-muted`} />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-muted rounded-full w-24" />
                                    {!isSidebar && <div className="h-2.5 bg-muted rounded-full w-40" />}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-2 pb-20">
                        {isSidebar ? (
                            <div className="space-y-6">
                                {groupedMembers.staff.length > 0 && (
                                    <div className="space-y-1">
                                        <p className="px-2 pb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/30">Squad Leaders — {groupedMembers.staff.length}</p>
                                        {groupedMembers.staff.map(m => (
                                            <MemberCardItem
                                                key={m.id}
                                                member={m}
                                                currentUserId={currentUserId || ""}
                                                isAdmin={isAdmin}
                                                communityCreatorId={community.created_by}
                                                onRoleChange={handleRoleChange}
                                                onRemove={handleRemove}
                                                isSidebar={true}
                                            />
                                        ))}
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <p className="px-2 pb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/30">The SQUAD — {groupedMembers.regular.length}</p>
                                    {groupedMembers.regular.map(m => (
                                        <MemberCardItem
                                            key={m.id}
                                            member={m}
                                            currentUserId={currentUserId || ""}
                                            isAdmin={isAdmin}
                                            communityCreatorId={community.created_by}
                                            onRoleChange={handleRoleChange}
                                            onRemove={handleRemove}
                                            isSidebar={true}
                                        />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <AnimatePresence mode="popLayout">
                                {filteredMembers.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-x-8">
                                        {filteredMembers.map(member => (
                                            <MemberCardItem
                                                key={member.id}
                                                member={member}
                                                currentUserId={currentUserId || ""}
                                                isAdmin={isAdmin}
                                                communityCreatorId={community.created_by}
                                                onRoleChange={handleRoleChange}
                                                onRemove={handleRemove}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-center py-24"
                                    >
                                        <div className="w-20 h-20 rounded-[32px] bg-muted/20 flex items-center justify-center mx-auto mb-6">
                                            <SearchX className="w-10 h-10 text-muted-foreground/20" />
                                        </div>
                                        <h3 className="font-black text-xl tracking-tighter">Ghost Town...</h3>
                                        <p className="text-muted-foreground/60 text-sm mt-1 max-w-xs mx-auto">No members match your current filter. Try broadening your search!</p>
                                        <Button
                                            variant="outline"
                                            className="mt-6 rounded-full font-bold uppercase text-[11px] tracking-widest px-8"
                                            onClick={() => { setSearchQuery(""); setActiveFilter("All"); }}
                                        >
                                            Reset Filters
                                        </Button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        )}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
