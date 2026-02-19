import { memo } from "react";
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FollowButton } from "@/components/FollowButton";
import { StartChatButton } from "@/components/StartChatButton";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import type { UserProfile } from "./ExploreHeader";

interface UserGridProps {
    loading: boolean;
    people: UserProfile[];
    handleUserClick: (id: string) => void;
    currentUser: any;
    onSeeAllClick: () => void;
}

export const UserGrid = memo(({ loading, people, handleUserClick, currentUser, onSeeAllClick }: UserGridProps) => (
    <section id="people-to-follow">
        <div className="flex items-center gap-2 mb-4">
            <Users className="text-primary" size={24} />
            <h2 className="text-xl font-bold text-foreground">People to Follow</h2>
        </div>

        {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="bg-card border-border animate-pulse">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-muted shrink-0" />
                                <div className="flex-1 space-y-2 min-w-0">
                                    <div className="h-4 bg-muted rounded w-2/3" />
                                    <div className="h-3 bg-muted rounded w-1/2" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        ) : people.length === 0 ? (
            <Card className="bg-card border-border">
                <CardContent className="p-8 text-center">
                    <Users className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">No users found</p>
                </CardContent>
            </Card>
        ) : (
            <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {people.map((user, index) => (
                        <motion.div
                            key={user.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            style={{ willChange: "transform, opacity" }}
                        >
                            <Card className="bg-card border-2 border-black/30 dark:border-border hover:border-primary transition-all hover:shadow-lg">
                                <CardContent className="p-3 sm:p-4">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div
                                            className="relative cursor-pointer shrink-0"
                                            onClick={() => handleUserClick(user.id)}
                                        >
                                            <Avatar className="h-12 w-12">
                                                <AvatarImage src={user.avatar_url || undefined} />
                                                <AvatarFallback className="bg-primary text-primary-foreground">
                                                    {user.username[0]?.toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>

                                        </div>
                                        <div
                                            className="flex-1 min-w-0 cursor-pointer"
                                            onClick={() => handleUserClick(user.id)}
                                        >
                                            <p className="font-semibold text-foreground truncate flex items-center gap-1">
                                                {user.full_name}
                                                <VerifiedBadge isVerified={user.is_verified} size={14} />
                                            </p>
                                            <p className="text-sm text-muted-foreground truncate">
                                                @{user.username}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                <span className="font-semibold text-foreground">
                                                    {user.follower_count}
                                                </span>{" "}
                                                followers
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <FollowButton
                                            userId={user.id}
                                            currentUserId={currentUser?.id}
                                        />
                                        <StartChatButton
                                            userId={user.id}
                                            currentUserId={currentUser?.id}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                <div className="flex justify-center">
                    <Button
                        variant="outline"
                        onClick={onSeeAllClick}
                        className="w-full sm:w-auto border-primary text-primary hover:bg-primary hover:text-primary-foreground animate-blink-glow"
                    >
                        See All People
                    </Button>
                </div>
            </>
        )}
    </section>
));

UserGrid.displayName = "UserGrid";
