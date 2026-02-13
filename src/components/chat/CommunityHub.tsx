import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, MoreHorizontal, Shield, ShieldCheck, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface Member {
    id: string;
    user_id: string;
    role: string;
    joined_at: string;
    profiles: {
        username: string;
        full_name: string;
        avatar_url: string;
        bio: string;
    };
}

export function CommunityHub({ community }: { community: any }) {
    const [members, setMembers] = useState<Member[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState("All");
    const [loading, setLoading] = useState(true);

    const fetchMembers = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('community_members' as any)
                .select(`
                    id,
                    user_id,
                    role,
                    joined_at,
                    profiles:user_id (
                        username,
                        full_name,
                        avatar_url,
                        bio
                    )
                `)
                .eq('community_id', community.id);

            if (error) throw error;
            setMembers(data as any[] || []);
        } catch (error) {
            console.error('Error fetching members:', error);
        } finally {
            setLoading(false);
        }
    }, [community.id]);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    const filteredMembers = members.filter(m => {
        const matchesSearch =
            m.profiles.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.profiles.username?.toLowerCase().includes(searchQuery.toLowerCase());

        if (activeFilter === "All") return matchesSearch;
        if (activeFilter === "Admins") return matchesSearch && m.role === 'admin';
        if (activeFilter === "Moderators") return matchesSearch && m.role === 'moderator';
        return matchesSearch && m.role === 'member';
    });

    const filters = ["All", "Admins", "Moderators", "Members"];

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'admin': return <ShieldCheck className="w-3 h-3 text-primary" />;
            case 'moderator': return <Shield className="w-3 h-3 text-blue-500" />;
            default: return <User className="w-3 h-3 text-muted-foreground" />;
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'admin': return 'border-primary text-primary bg-primary/5';
            case 'moderator': return 'border-blue-500 text-blue-500 bg-blue-500/5';
            default: return 'border-muted-foreground/30 text-muted-foreground bg-muted/5';
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-card">
            <div className="p-4 space-y-4">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search members..."
                        className="pl-10 h-11 bg-muted/30 border-none rounded-2xl"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Filters */}
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {filters.map(filter => (
                        <Button
                            key={filter}
                            variant={activeFilter === filter ? "default" : "ghost"}
                            size="sm"
                            className={`rounded-full px-4 h-8 text-xs font-semibold ${activeFilter === filter
                                ? "bg-primary text-white hover:bg-primary/90"
                                : "text-muted-foreground"
                                }`}
                            onClick={() => setActiveFilter(filter)}
                        >
                            {filter}
                        </Button>
                    ))}
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 pt-0 space-y-4">
                    {filteredMembers.map(member => (
                        <div key={member.id} className="flex items-center gap-4 group">
                            <div className="relative">
                                <Avatar className="h-14 w-14 border-2 border-background shadow-sm">
                                    <AvatarImage src={member.profiles.avatar_url} className="object-cover" />
                                    <AvatarFallback className="bg-primary/5 text-primary text-xl font-bold">
                                        {member.profiles.full_name?.[0]}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-background" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-sm truncate">{member.profiles.full_name}</h3>
                                    <Badge variant="outline" className={`text-[10px] px-1.5 h-4 gap-1 ${getRoleColor(member.role)}`}>
                                        {getRoleIcon(member.role)}
                                        {member.role.toUpperCase()}
                                    </Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground truncate italic">
                                    {member.profiles.bio || `@${member.profiles.username}`}
                                </p>
                                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                    Joined {format(new Date(member.joined_at), 'MMM yyyy')}
                                </p>
                            </div>

                            <Button variant="ghost" size="icon" className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}

                    {filteredMembers.length === 0 && !loading && (
                        <div className="text-center py-12 text-muted-foreground">
                            <p className="text-sm">No members found</p>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Invite Button FAB */}
            <div className="absolute bottom-6 right-6">
                <Button size="icon" className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-white">
                    <UserPlus className="h-6 w-6" />
                </Button>
            </div>
        </div>
    );
}
