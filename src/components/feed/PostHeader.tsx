import { memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { MoreVertical, Edit, Trash } from "lucide-react";
import { motion } from "framer-motion";
import { calculateReadTime } from "@/utils/readTime";

interface PostProfile {
    username: string;
    full_name: string;
    avatar_url: string | null;
    is_verified?: boolean | null;
}

interface PostHeaderProps {
    profile: PostProfile;
    createdAt: string;
    content: string; // Used for read time
    isOwner: boolean;
    index: number; // For loading priority
    onProfileClick: (e: React.MouseEvent) => void;
    onEdit: () => void;
    onDelete: () => void;
}

export const PostHeader = memo(({
    profile,
    createdAt,
    content,
    isOwner,
    index,
    onProfileClick,
    onEdit,
    onDelete
}: PostHeaderProps) => {
    return (
        <div className="flex items-center justify-between mb-4">
            <motion.div
                className="flex items-center gap-3 cursor-pointer"
                onClick={onProfileClick}
                whileHover={{ x: 2 }}
                transition={{ type: "spring", stiffness: 300 }}
            >
                <Avatar className="w-14 h-14 border-2 border-background ring-2 ring-border hover:ring-primary/40 transition-all">
                    <AvatarImage
                        src={profile.avatar_url || undefined}
                        loading={index < 2 ? "eager" : "lazy"}
                        decoding="async"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20">
                        {profile.username[0]}
                    </AvatarFallback>
                </Avatar>
                <div>
                    <div className="flex items-center gap-1.5">
                        <h3 className="font-semibold hover:text-primary transition-colors">
                            {profile.full_name}
                        </h3>
                        <VerifiedBadge isVerified={profile.is_verified} size={14} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        @{profile.username} · {new Date(createdAt).toLocaleDateString()} · {calculateReadTime(content)}
                    </p>
                </div>
            </motion.div>

            {isOwner && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="w-5 h-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={onEdit}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Post
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={onDelete}
                            className="text-destructive"
                        >
                            <Trash className="w-4 h-4 mr-2" />
                            Delete Post
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    );
});

PostHeader.displayName = "PostHeader";
