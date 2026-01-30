import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate, useParams } from "react-router-dom";
import { Users, Construction } from "lucide-react";

interface Group {
    id: string;
    name: string;
    description: string;
    avatar_url: string | null;
    is_public: boolean;
    member_count?: number;
}

interface GroupsListProps {
    currentUserId: string;
}

export function GroupsList({ currentUserId }: GroupsListProps) {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { id: activeId } = useParams();

    useEffect(() => {
        // Groups feature coming soon - show empty state
        setLoading(false);
        setGroups([]);
    }, [currentUserId]);

    const handleGroupClick = (groupId: string) => {
        navigate(`/messages/group/${groupId}`);
    };

    if (loading) {
        return <div className="p-4 text-center text-muted-foreground">Loading communities...</div>;
    }

    return (
        <div className="p-8 text-center text-muted-foreground">
            <Construction className="w-12 h-12 mx-auto mb-2 opacity-40 text-primary" />
            <p className="font-medium">Communities Coming Soon!</p>
            <p className="text-sm mt-1">Group chats and communities will be available in the next update.</p>
        </div>
    );
}
