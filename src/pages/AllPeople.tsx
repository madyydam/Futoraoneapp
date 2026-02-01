import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, ArrowLeft, Users } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { UserCard } from "@/components/UserCard";

interface UserProfile {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    bio: string | null;
    follower_count?: number;
    following_count?: number;
    is_verified?: boolean | null;
}

const AllPeople = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const USERS_PER_PAGE = 20;

    const navigate = useNavigate();

    useEffect(() => {
        fetchCurrentUser();
        fetchUsers(0, "");
    }, []);

    // Debounce search query
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            // Reset page and fetch fresh results when search changes
            setPage(0);
            fetchUsers(0, searchQuery);
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const fetchCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
    };

    const fetchUsers = async (pageNumber: number, query: string) => {
        if (pageNumber === 0) setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const start = pageNumber * USERS_PER_PAGE;
            const end = start + USERS_PER_PAGE - 1;

            let supabaseQuery = supabase
                .from("profiles")
                .select(`
                    id, 
                    username, 
                    full_name, 
                    avatar_url, 
                    bio, 
                    is_verified,
                    followers:follows!following_id(count),
                    following:follows!follower_id(count)
                `)
                .neq("id", user?.id || "")
                .order("created_at", { ascending: false })
                .range(start, end);

            if (query.trim()) {
                supabaseQuery = supabaseQuery.or(`username.ilike.%${query}%,full_name.ilike.%${query}%`);
            }

            const { data, error } = await supabaseQuery;

            if (error) throw error;

            const newUsers = (data || []).map((profile: any) => ({
                id: profile.id,
                username: profile.username,
                full_name: profile.full_name,
                avatar_url: profile.avatar_url,
                bio: profile.bio,
                is_verified: profile.is_verified,
                follower_count: profile.followers?.[0]?.count || 0,
                following_count: profile.following?.[0]?.count || 0,
            }));

            if (pageNumber === 0) {
                setUsers(newUsers);
            } else {
                setUsers(prev => [...prev, ...newUsers]);
            }

            setHasMore(newUsers.length === USERS_PER_PAGE);

        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const channel = supabase
            .channel('all-people-sync')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles'
                },
                (payload) => {
                    const updatedProfile = payload.new as any;
                    setUsers(currentUsers => currentUsers.map(user => {
                        if (user.id === updatedProfile.id) {
                            return {
                                ...user,
                                username: updatedProfile.username,
                                full_name: updatedProfile.full_name,
                                avatar_url: updatedProfile.avatar_url,
                                is_verified: updatedProfile.is_verified,
                                bio: updatedProfile.bio
                            };
                        }
                        return user;
                    }));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const loadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchUsers(nextPage, searchQuery);
    };

    const handleSearch = useCallback((e: React.FormEvent) => {
        e.preventDefault();
    }, []);

    return (
        <div className="min-h-screen bg-background pb-20">
            <div className="sticky top-0 z-10 bg-card border-b border-border p-4 space-y-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-foreground">People</h1>
                        <p className="text-sm text-muted-foreground">{users.length} users</p>
                    </div>
                </div>
                <form onSubmit={handleSearch}>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                        <Input
                            type="text"
                            placeholder="Search people..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-background border-border text-foreground"
                        />
                    </div>
                </form>
            </div>

            <div className="p-3 sm:p-4">
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Card key={i} className="bg-card border-border animate-pulse">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-muted" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-muted rounded w-1/3" />
                                            <div className="h-3 bg-muted rounded w-1/4" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : users.length === 0 ? (
                    <Card className="bg-card border-border">
                        <CardContent className="p-12 text-center">
                            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                            <p className="text-muted-foreground">
                                {searchQuery ? "No users found matching your search" : "No users available"}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {users.map((user, index) => (
                            <UserCard
                                key={user.id}
                                user={user}
                                currentUser={currentUser}
                                index={index}
                            />
                        ))}
                    </div>
                )}

                {hasMore && !loading && users.length > 0 && (
                    <div className="mt-6 flex justify-center pb-8">
                        <Button
                            variant="outline"
                            onClick={loadMore}
                            className="min-w-[150px]"
                        >
                            Load More
                        </Button>
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    );
};

export default AllPeople;
