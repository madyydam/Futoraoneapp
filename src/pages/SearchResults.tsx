import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { BottomNav } from "@/components/BottomNav";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { FollowButton } from "@/components/FollowButton";
import { StartChatButton } from "@/components/StartChatButton";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import type { User } from "@supabase/supabase-js";
import { sanitizePostgrestSearch } from "@/lib/security";

interface SearchUser {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    bio: string | null;
    is_verified?: boolean | null;
}

const SearchResults = () => {
    const [searchParams] = useSearchParams();
    const initialQuery = searchParams.get("q") || "";
    const [query, setQuery] = useState(initialQuery);
    const [users, setUsers] = useState<SearchUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchCurrentUser();
    }, []);

    useEffect(() => {
        if (initialQuery) {
            searchUsers(initialQuery);
        }
    }, [initialQuery]);

    const fetchCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
    };

    const searchUsers = async (searchTerm: string) => {
        const cleanTerm = sanitizePostgrestSearch(searchTerm);
        if (!cleanTerm) {
            setUsers([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const { data, error } = await supabase
            .from("profiles")
            .select("id, username, full_name, avatar_url, bio, is_verified")
            .or(`username.ilike.%${cleanTerm}%,full_name.ilike.%${cleanTerm}%`)
            .limit(20);

        if (!error && data) {
            setUsers(data as SearchUser[]);
        }
        setLoading(false);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            navigate(`/search?q=${encodeURIComponent(query)}`);
            searchUsers(query.trim());
        }
    };

    const handleUserClick = (userId: string) => {
        navigate(`/user/${userId}`);
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <div className="sticky top-0 z-10 bg-card border-b border-border p-4 space-y-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <form onSubmit={handleSearch} className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="pl-9"
                            placeholder="Search..."
                        />
                    </form>
                </div>
            </div>

            <div className="p-3 sm:p-4">
                <h2 className="text-lg font-semibold mb-4 text-foreground">
                    {initialQuery ? `Results for "${initialQuery}"` : "Search for users"}
                </h2>

                {loading ? (
                    <div className="text-center py-8">
                        <p className="text-muted-foreground">Searching...</p>
                    </div>
                ) : users.length === 0 ? (
                    <Card className="bg-card border-border">
                        <CardContent className="p-8 text-center">
                            <p className="text-muted-foreground">
                                {initialQuery ? "No users found" : "Enter a name or username to search"}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {users.map((user) => (
                            <Card key={user.id} className="bg-card border-border hover:border-primary transition-colors">
                                <CardContent className="p-3 sm:p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div
                                            className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
                                            onClick={() => handleUserClick(user.id)}
                                        >
                                            <Avatar className="h-12 w-12 shrink-0">
                                                <AvatarImage src={user.avatar_url || undefined} />
                                                <AvatarFallback className="bg-primary text-primary-foreground">
                                                    {user.username[0]?.toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-foreground truncate flex items-center gap-1">
                                                    {user.full_name}
                                                    <VerifiedBadge isVerified={user.is_verified} size={14} />
                                                </p>
                                                <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                                                {user.bio && (
                                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{user.bio}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            <FollowButton
                                                userId={user.id}
                                                currentUserId={currentUser?.id}
                                            />
                                            <StartChatButton
                                                userId={user.id}
                                                currentUserId={currentUser?.id}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    );
};

export default SearchResults;
