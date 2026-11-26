import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStartChat } from "@/hooks/useStartChat";
import { sanitizePostgrestSearch } from "@/lib/security";

interface Profile {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
}

interface UserSearchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentUserId: string;
}

export function UserSearchDialog({ open, onOpenChange, currentUserId }: UserSearchDialogProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Profile[]>([]);
    const [searching, setSearching] = useState(false);
    const { startChat, loading } = useStartChat();

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanQuery = sanitizePostgrestSearch(query);
        if (!cleanQuery) return;

        setSearching(true);
        let supabaseQuery = supabase
            .from("profiles")
            .select("id, username, full_name, avatar_url")
            .or(`username.ilike.%${cleanQuery}%,full_name.ilike.%${cleanQuery}%`);

        if (currentUserId) {
            supabaseQuery = supabaseQuery.neq("id", currentUserId);
        }

        const { data, error } = await supabaseQuery.limit(10);

        if (!error && data) {
            setResults(data);
        }
        setSearching(false);
    };

    const handleStartChat = async (userId: string) => {
        await startChat(userId, currentUserId);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>New Message</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <Input
                            placeholder="Search people..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        <Button type="submit" size="icon" disabled={searching}>
                            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                    </form>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {results.length === 0 && query && !searching ? (
                            <p className="text-center text-muted-foreground py-4">No users found.</p>
                        ) : (
                            results.map((user) => (
                                <div
                                    key={user.id}
                                    className="flex items-center justify-between p-2 hover:bg-muted rounded-lg cursor-pointer"
                                    onClick={() => handleStartChat(user.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage src={user.avatar_url || undefined} />
                                            <AvatarFallback>{user.username[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">{user.full_name}</p>
                                            <p className="text-sm text-muted-foreground">@{user.username}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
