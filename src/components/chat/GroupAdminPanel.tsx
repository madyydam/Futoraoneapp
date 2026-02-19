import { useState, useEffect, useCallback, memo } from "react";
import {
    Sheet, SheetContent, SheetHeader, SheetTitle
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Settings, Users, AlertTriangle, Crown, UserMinus,
    ArrowUpCircle, ArrowDownCircle, Upload, Globe, Lock,
    Trash2, LogOut, ShieldAlert, Search, UserPlus, ChevronDown, ChevronUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import imageCompression from 'browser-image-compression';
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Group {
    id: string;
    name: string;
    description: string;
    avatar_url: string | null;
    is_public: boolean;
    created_by: string;
    is_verified?: boolean;
}

interface Member {
    user_id: string;
    role: 'admin' | 'member';
    profiles: { full_name: string; avatar_url: string | null; username?: string };
}

interface Follower {
    user_id: string;
    profiles: { full_name: string; avatar_url: string | null };
}

interface GroupAdminPanelProps {
    group: Group;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentUserId: string;
    onGroupUpdated?: () => void;
    onGroupDeleted?: () => void;
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'danger', label: 'Danger', icon: AlertTriangle },
] as const;

type TabId = typeof TABS[number]['id'];

// ─── Member Row ───────────────────────────────────────────────────────────────

const MemberAction = memo(({
    member, currentUserId, isCreator, onPromote, onDemote, onRemove, actionLoading
}: {
    member: Member;
    currentUserId: string;
    isCreator: boolean;
    onPromote: (id: string) => void;
    onDemote: (id: string) => void;
    onRemove: (id: string) => void;
    actionLoading: string | null;
}) => {
    const isMe = member.user_id === currentUserId;
    const isBusy = actionLoading === member.user_id;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8, height: 0 }}
            className="flex items-center gap-3 py-3 border-b border-border/30 last:border-0"
        >
            <Avatar className="h-10 w-10 ring-1 ring-border flex-shrink-0">
                <AvatarImage src={member.profiles.avatar_url || undefined} />
                <AvatarFallback className="text-[11px] bg-gradient-to-br from-primary/15 to-violet-500/15 text-primary font-bold">
                    {member.profiles.full_name?.[0]?.toUpperCase()}
                </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <p className="text-[13px] font-bold truncate">{member.profiles.full_name}</p>
                    {isMe && <span className="text-[9px] text-muted-foreground font-medium">(you)</span>}
                </div>
                <p className="text-[11px] text-muted-foreground">
                    {member.role === 'admin' ? '👑 Admin' : 'Member'}
                </p>
            </div>

            {/* Actions — don't show for self or creator */}
            {!isMe && !isCreator && (
                <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Promote / Demote */}
                    {member.role === 'member' ? (
                        <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 rounded-full text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            onClick={() => onPromote(member.user_id)}
                            disabled={isBusy}
                            title="Make Admin"
                        >
                            <ArrowUpCircle className="w-4 h-4" />
                        </Button>
                    ) : (
                        <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted"
                            onClick={() => onDemote(member.user_id)}
                            disabled={isBusy}
                            title="Remove Admin"
                        >
                            <ArrowDownCircle className="w-4 h-4" />
                        </Button>
                    )}

                    {/* Remove */}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="ghost" size="icon"
                                className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                                disabled={isBusy}
                                title="Remove member"
                            >
                                <UserMinus className="w-4 h-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-[340px] rounded-2xl">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Remove {member.profiles.full_name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    They'll be removed from this group and won't be able to see messages.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={() => onRemove(member.user_id)}
                                    className="rounded-full bg-destructive hover:bg-destructive/90"
                                >
                                    Remove
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            )}

            {/* Creator badge */}
            {isCreator && (
                <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full border border-amber-200">
                    <Crown className="w-3 h-3" /> Creator
                </span>
            )}
        </motion.div>
    );
});
MemberAction.displayName = "MemberAction";

// ─── Main Component ───────────────────────────────────────────────────────────

export function GroupAdminPanel({
    group, open, onOpenChange, currentUserId, onGroupUpdated, onGroupDeleted
}: GroupAdminPanelProps) {
    const [activeTab, setActiveTab] = useState<TabId>('general');
    const [members, setMembers] = useState<Member[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [memberSearch, setMemberSearch] = useState('');
    const [followers, setFollowers] = useState<Follower[]>([]);
    const [addingMember, setAddingMember] = useState<string | null>(null);
    const [showAddPeople, setShowAddPeople] = useState(false);

    // General tab state
    const [name, setName] = useState(group.name);
    const [description, setDescription] = useState(group.description || '');
    const [isPublic, setIsPublic] = useState(group.is_public);
    const [iconFile, setIconFile] = useState<File | null>(null);
    const [iconPreview, setIconPreview] = useState<string | null>(group.avatar_url);
    const [saving, setSaving] = useState(false);

    // Sync when group changes
    useEffect(() => {
        if (open) {
            setName(group.name);
            setDescription(group.description || '');
            setIsPublic(group.is_public);
            setIconPreview(group.avatar_url);
            setIconFile(null);
            setActiveTab('general');
        }
    }, [open, group]);

    const fetchMembers = useCallback(async () => {
        setLoadingMembers(true);
        try {
            const { data: membersData } = await supabase
                .from('group_members').select('user_id, role').eq('group_id', group.id);

            if (!membersData?.length) { setMembers([]); return; }

            const ids = membersData.map((m: any) => m.user_id);
            const { data: profiles } = await supabase
                .from('profiles').select('id, full_name, avatar_url').in('id', ids);

            const profileMap: Record<string, any> = {};
            (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });

            const enriched: Member[] = membersData.map((m: any) => ({
                user_id: m.user_id,
                role: m.role,
                profiles: profileMap[m.user_id] || { full_name: 'Unknown', avatar_url: null }
            }));

            enriched.sort((a, b) => {
                if (a.user_id === group.created_by) return -1;
                if (b.user_id === group.created_by) return 1;
                if (a.role === 'admin' && b.role !== 'admin') return -1;
                if (b.role === 'admin' && a.role !== 'admin') return 1;
                return a.profiles.full_name.localeCompare(b.profiles.full_name);
            });

            setMembers(enriched);
        } finally {
            setLoadingMembers(false);
        }
    }, [group.id, group.created_by]);

    const fetchFollowers = useCallback(async () => {
        try {
            const { data: followsData } = await supabase
                .from('follows' as any)
                .select('follower_id')
                .eq('following_id', currentUserId);

            if (!followsData?.length) { setFollowers([]); return; }

            const followerIds = (followsData as any[]).map(f => f.follower_id);
            const { data: profilesData } = await supabase
                .from('profiles').select('id, full_name, avatar_url').in('id', followerIds);

            // Filter out those already in the group (by refreshed members state)
            const memberIds = new Set(members.map(m => m.user_id));
            const notInGroup: Follower[] = (profilesData || []).reduce((acc: Follower[], p: any) => {
                if (!memberIds.has(p.id)) {
                    acc.push({ user_id: p.id, profiles: { full_name: p.full_name, avatar_url: p.avatar_url } });
                }
                return acc;
            }, []);

            setFollowers(notInGroup);
        } catch (err) {
            console.error('Failed to fetch followers:', err);
        }
    }, [currentUserId, members]);

    useEffect(() => {
        if (open && activeTab === 'members') {
            fetchMembers();
        }
    }, [open, activeTab, fetchMembers]);

    // Refetch followers whenever members list changes (so newly added ones disappear)
    useEffect(() => {
        if (open && activeTab === 'members') fetchFollowers();
    }, [open, activeTab, members, fetchFollowers]);

    // ── General: save handler
    const handleSaveGeneral = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        try {
            let avatarUrl = group.avatar_url;
            if (iconFile) {
                let compressed = iconFile;
                try {
                    compressed = await imageCompression(iconFile, { maxSizeMB: 0.5, maxWidthOrHeight: 500, useWebWorker: true });
                } catch { /* use original */ }
                const ext = compressed.name.split('.').pop();
                const path = `${currentUserId}/group_${Date.now()}.${ext}`;
                const { error: uploadErr } = await supabase.storage
                    .from('post_images').upload(path, compressed, { upsert: true, contentType: compressed.type });
                if (!uploadErr) {
                    const { data: { publicUrl } } = supabase.storage.from('post_images').getPublicUrl(path);
                    avatarUrl = publicUrl;
                }
            }

            const { error } = await supabase.from('groups' as any)
                .update({ name: name.trim(), description: description.trim(), avatar_url: avatarUrl, is_public: isPublic, updated_at: new Date().toISOString() })
                .eq('id', group.id);

            if (error) throw error;
            toast.success('Group updated ✅');
            onGroupUpdated?.();
        } catch {
            toast.error('Failed to update group');
        } finally {
            setSaving(false);
        }
    };

    // ── Members: promote
    const handlePromote = async (userId: string) => {
        setActionLoading(userId);
        try {
            const { error } = await supabase.from('group_members' as any)
                .update({ role: 'admin' }).eq('group_id', group.id).eq('user_id', userId);
            if (error) throw error;
            toast.success('Promoted to admin 👑');
            setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role: 'admin' } : m));
        } catch { toast.error('Failed to promote member'); }
        finally { setActionLoading(null); }
    };

    // ── Members: demote
    const handleDemote = async (userId: string) => {
        setActionLoading(userId);
        try {
            const { error } = await supabase.from('group_members' as any)
                .update({ role: 'member' }).eq('group_id', group.id).eq('user_id', userId);
            if (error) throw error;
            toast.success('Admin role removed');
            setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role: 'member' } : m));
        } catch { toast.error('Failed to demote member'); }
        finally { setActionLoading(null); }
    };

    // ── Members: remove
    const handleRemove = async (userId: string) => {
        setActionLoading(userId);
        try {
            const { error } = await supabase.from('group_members' as any)
                .delete().eq('group_id', group.id).eq('user_id', userId);
            if (error) throw error;
            toast.success('Member removed');
            setMembers(prev => prev.filter(m => m.user_id !== userId));
        } catch { toast.error('Failed to remove member'); }
        finally { setActionLoading(null); }
    };

    // ── Followers: add to group
    const handleAddFollower = async (follower: Follower) => {
        setAddingMember(follower.user_id);
        try {
            const { error } = await supabase.from('group_members' as any)
                .insert({ group_id: group.id, user_id: follower.user_id, role: 'member' });
            if (error) throw error;
            toast.success(`${follower.profiles.full_name} added to group! 🎉`);
            // Optimistically add to members list and remove from followers
            setMembers(prev => [...prev, { user_id: follower.user_id, role: 'member', profiles: follower.profiles }]);
            setFollowers(prev => prev.filter(f => f.user_id !== follower.user_id));
        } catch {
            toast.error('Failed to add member');
        } finally {
            setAddingMember(null);
        }
    };

    // ── Danger: delete group
    const handleDeleteGroup = async () => {
        try {
            const { error } = await supabase.from('groups' as any).delete().eq('id', group.id);
            if (error) throw error;
            toast.success('Group deleted');
            onOpenChange(false);
            onGroupDeleted?.();
        } catch { toast.error('Failed to delete group'); }
    };

    // ── Danger: leave group
    const handleLeaveGroup = async () => {
        try {
            const { error } = await supabase.from('group_members' as any)
                .delete().eq('group_id', group.id).eq('user_id', currentUserId);
            if (error) throw error;
            toast.success('You left the group');
            onOpenChange(false);
            onGroupDeleted?.();
        } catch { toast.error('Failed to leave group'); }
    };

    const filteredMembers = memberSearch.trim()
        ? members.filter(m => m.profiles.full_name.toLowerCase().includes(memberSearch.toLowerCase()))
        : members;

    const isCreatorOfGroup = (userId: string) => userId === group.created_by;
    const amICreator = currentUserId === group.created_by;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="rounded-t-3xl pb-safe max-h-[90dvh] p-0 overflow-hidden">
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-border" />
                </div>

                <SheetHeader className="px-5 pb-3 border-b border-border/40">
                    <SheetTitle className="flex items-center gap-2 text-[17px]">
                        <ShieldAlert className="w-5 h-5 text-primary" />
                        Group Settings
                    </SheetTitle>
                </SheetHeader>

                {/* Tab Bar */}
                <div className="flex gap-1 px-4 pt-3 pb-1">
                    {TABS.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[12px] font-bold transition-all",
                                activeTab === id
                                    ? id === 'danger'
                                        ? "bg-destructive/10 text-destructive"
                                        : "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-muted/50"
                            )}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="overflow-y-auto px-5 pb-8 pt-3" style={{ maxHeight: 'calc(90dvh - 160px)' }}>
                    <AnimatePresence mode="wait">

                        {/* ── GENERAL TAB ────────────────────────────────── */}
                        {activeTab === 'general' && (
                            <motion.form
                                key="general"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.15 }}
                                onSubmit={handleSaveGeneral}
                                className="space-y-4"
                            >
                                {/* Avatar */}
                                <div className="flex flex-col items-center gap-2 pt-1">
                                    <label className="relative group cursor-pointer">
                                        <Avatar className="h-20 w-20 ring-4 ring-primary/20 shadow-lg transition-transform group-hover:scale-105">
                                            <AvatarImage src={iconPreview || undefined} className="object-cover" />
                                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-violet-500/20 text-primary font-black text-2xl">
                                                {name[0]?.toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Upload className="h-5 w-5" />
                                        </div>
                                        <input type="file" accept="image/*" className="hidden" onChange={e => {
                                            const f = e.target.files?.[0]; if (!f) return;
                                            setIconFile(f);
                                            const r = new FileReader();
                                            r.onloadend = () => setIconPreview(r.result as string);
                                            r.readAsDataURL(f);
                                        }} />
                                    </label>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Change Avatar</p>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[13px] font-bold">Group Name</Label>
                                    <Input value={name} onChange={e => setName(e.target.value)} required
                                        className="rounded-xl font-medium" />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[13px] font-bold">Description</Label>
                                    <Textarea value={description} onChange={e => setDescription(e.target.value)}
                                        className="resize-none h-20 rounded-xl text-[14px]" placeholder="What's this group about?" />
                                </div>

                                {/* Privacy toggle */}
                                <button type="button" onClick={() => setIsPublic(p => !p)}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all",
                                        isPublic ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20" : "border-amber-300 bg-amber-50 dark:bg-amber-900/20"
                                    )}>
                                    {isPublic
                                        ? <Globe className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                                        : <Lock className="w-5 h-5 text-amber-600 flex-shrink-0" />}
                                    <div className="flex-1">
                                        <p className="font-bold text-[13px]">{isPublic ? 'Public Group' : 'Private Group'}</p>
                                        <p className="text-[11px] text-muted-foreground">
                                            {isPublic ? 'Anyone can find and join' : 'Invite only'}
                                        </p>
                                    </div>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Tap to toggle</span>
                                </button>

                                <Button type="submit" disabled={saving || !name.trim()}
                                    className="w-full rounded-xl bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90 font-bold h-11">
                                    {saving ? 'Saving…' : 'Save Changes'}
                                </Button>
                            </motion.form>
                        )}

                        {/* ── MEMBERS TAB ────────────────────────────────── */}
                        {activeTab === 'members' && (
                            <motion.div
                                key="members"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.15 }}
                                className="space-y-3"
                            >
                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        value={memberSearch}
                                        onChange={e => setMemberSearch(e.target.value)}
                                        placeholder="Search members…"
                                        className="pl-9 rounded-xl bg-muted/40 border-0 focus-visible:ring-primary/30"
                                    />
                                </div>

                                <div className="flex items-center justify-between px-0.5">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">
                                        {members.length} member{members.length !== 1 ? 's' : ''}
                                    </p>
                                </div>

                                {loadingMembers ? (
                                    <div className="space-y-3 py-2">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="flex items-center gap-3 animate-pulse">
                                                <div className="h-10 w-10 rounded-full bg-muted flex-shrink-0" />
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-3 bg-muted rounded w-1/3" />
                                                    <div className="h-2.5 bg-muted rounded w-1/4" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <AnimatePresence>
                                        {filteredMembers.map(member => (
                                            <MemberAction
                                                key={member.user_id}
                                                member={member}
                                                currentUserId={currentUserId}
                                                isCreator={isCreatorOfGroup(member.user_id)}
                                                onPromote={handlePromote}
                                                onDemote={handleDemote}
                                                onRemove={handleRemove}
                                                actionLoading={actionLoading}
                                            />
                                        ))}
                                    </AnimatePresence>
                                )}

                                {/* ── Add People from Followers ── */}
                                {!loadingMembers && (
                                    <div className="mt-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowAddPeople(s => !s)}
                                            className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-primary/5 border border-primary/20 text-primary font-bold text-[13px] transition-all hover:bg-primary/10"
                                        >
                                            <div className="flex items-center gap-2">
                                                <UserPlus className="w-4 h-4" />
                                                Add from Followers
                                                {followers.length > 0 && (
                                                    <span className="bg-primary text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                                        {followers.length}
                                                    </span>
                                                )}
                                            </div>
                                            {showAddPeople
                                                ? <ChevronUp className="w-4 h-4" />
                                                : <ChevronDown className="w-4 h-4" />}
                                        </button>

                                        <AnimatePresence>
                                            {showAddPeople && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.18 }}
                                                    className="overflow-hidden"
                                                >
                                                    {followers.length === 0 ? (
                                                        <p className="text-center text-[12px] text-muted-foreground py-4">
                                                            All your followers are already in this group 🎉
                                                        </p>
                                                    ) : (
                                                        <div className="pt-2">
                                                            {followers.map(f => (
                                                                <div key={f.user_id}
                                                                    className="flex items-center gap-3 py-2.5 border-b border-border/20 last:border-0">
                                                                    <Avatar className="h-9 w-9 ring-1 ring-border flex-shrink-0">
                                                                        <AvatarImage src={f.profiles.avatar_url || undefined} />
                                                                        <AvatarFallback className="text-[11px] bg-gradient-to-br from-primary/15 to-violet-500/15 text-primary font-bold">
                                                                            {f.profiles.full_name?.[0]?.toUpperCase()}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <p className="flex-1 text-[13px] font-semibold truncate">{f.profiles.full_name}</p>
                                                                    <Button
                                                                        size="sm"
                                                                        disabled={addingMember === f.user_id}
                                                                        onClick={() => handleAddFollower(f)}
                                                                        className="h-8 rounded-full px-3 text-[12px] font-bold bg-primary/10 text-primary hover:bg-primary hover:text-white border border-primary/30 transition-all"
                                                                        variant="ghost"
                                                                    >
                                                                        {addingMember === f.user_id ? '…' : '+ Add'}
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* ── DANGER TAB ─────────────────────────────────── */}
                        {activeTab === 'danger' && (
                            <motion.div
                                key="danger"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.15 }}
                                className="space-y-3 pt-2"
                            >
                                <div className="p-4 rounded-2xl bg-destructive/5 border border-destructive/20">
                                    <p className="text-[12px] text-destructive/80 font-medium">
                                        ⚠️ These actions are irreversible. Proceed with caution.
                                    </p>
                                </div>

                                {/* Leave Group */}
                                {!amICreator && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="outline" className="w-full rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 gap-2 h-12 font-bold">
                                                <LogOut className="w-4 h-4" /> Leave Group
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="max-w-[340px] rounded-2xl">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Leave group?</AlertDialogTitle>
                                                <AlertDialogDescription>You'll lose access to all messages in this group.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleLeaveGroup} className="rounded-full bg-destructive hover:bg-destructive/90">Leave</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}

                                {/* Delete Group — only for creator */}
                                {amICreator && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" className="w-full rounded-xl gap-2 h-12 font-bold">
                                                <Trash2 className="w-4 h-4" /> Delete Group
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="max-w-[340px] rounded-2xl">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete "{group.name}"?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    All messages, members, and data will be permanently deleted. This cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleDeleteGroup} className="rounded-full bg-destructive hover:bg-destructive/90">
                                                    Delete Forever
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </SheetContent>
        </Sheet>
    );
}
