import { memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";

import { FollowButton } from "@/components/FollowButton";
import { StartChatButton } from "@/components/StartChatButton";
import { VerifiedBadge } from "@/components/VerifiedBadge";

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

interface UserCardProps {
    user: UserProfile;
    currentUser: any;
    index: number;
}

export const UserCard = memo(({ user, currentUser, index }: UserCardProps) => {
    const navigate = useNavigate();

    const handleCardClick = useCallback(() => {
        navigate(`/user/${user.id}`);
    }, [navigate, user.id]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.05, 0.5) }}
            style={{ willChange: "transform, opacity" }}
            layout
        >
            <Card className="bg-card border-border hover:border-primary transition-colors">
                <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                        <div
                            className="relative cursor-pointer shrink-0"
                            onClick={handleCardClick}
                        >
                            <Avatar className="h-12 w-12 sm:h-14 sm:w-14">
                                <AvatarImage src={user.avatar_url || undefined} loading="lazy" />
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                    {user.username[0]?.toUpperCase()}
                                </AvatarFallback>
                            </Avatar>

                        </div>

                        <div className="flex-1 min-w-0">
                            <div
                                className="cursor-pointer"
                                onClick={handleCardClick}
                            >
                                <div className="flex items-center gap-1">
                                    <p className="font-semibold text-foreground truncate">
                                        {user.full_name}
                                    </p>
                                    <VerifiedBadge isVerified={user.is_verified} size={14} />
                                </div>
                                <p className="text-sm text-muted-foreground truncate">
                                    @{user.username}
                                </p>
                                {user.bio && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                        {user.bio}
                                    </p>
                                )}
                                <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                                    <span>
                                        <span className="font-semibold text-foreground">
                                            {user.follower_count}
                                        </span>{" "}
                                        followers
                                    </span>
                                    <span>
                                        <span className="font-semibold text-foreground">
                                            {user.following_count}
                                        </span>{" "}
                                        following
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
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
        </motion.div>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.user.id === nextProps.user.id &&
        prevProps.user.follower_count === nextProps.user.follower_count &&
        prevProps.user.following_count === nextProps.user.following_count &&
        prevProps.user.is_verified === nextProps.user.is_verified &&
        prevProps.currentUser?.id === nextProps.currentUser?.id
    );
});

UserCard.displayName = "UserCard";
