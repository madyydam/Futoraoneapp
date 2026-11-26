import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, UserMinus } from "lucide-react";
import { sendPushNotification } from "@/utils/notifications";

interface FollowButtonProps {
    userId: string;
    currentUserId: string | undefined;
    onFollowChange?: () => void;
}

export const FollowButton = ({ userId, currentUserId, onFollowChange }: FollowButtonProps) => {
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const checkFollowStatus = useCallback(async () => {
        if (!currentUserId) {
            setIsFollowing(false);
            return;
        }

        const { data } = await supabase
            .from("follows")
            .select("id")
            .eq("follower_id", currentUserId)
            .eq("following_id", userId)
            .maybeSingle();

        setIsFollowing(!!data);
    }, [currentUserId, userId]);

    useEffect(() => {
        checkFollowStatus();
    }, [checkFollowStatus]);

    const handleFollow = async () => {
        if (!currentUserId) {
            toast({
                title: "Error",
                description: "You must be logged in to follow users",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);

        try {
            if (isFollowing) {
                const { error } = await supabase
                    .from("follows")
                    .delete()
                    .eq("follower_id", currentUserId)
                    .eq("following_id", userId);

                if (error) throw error;
                setIsFollowing(false);
                toast({
                    title: "Unfollowed",
                    description: "You have unfollowed this user",
                });
            } else {
                let { error } = await supabase.from("follows").insert({
                    follower_id: currentUserId,
                    following_id: userId,
                });

                // Auto-heal missing profile row if FK constraint fires, then retry once
                if (error && (error.code === "23503" || error.message?.includes("follows_follower_id_fkey"))) {
                    await (supabase.rpc as any)("ensure_my_profile");
                    const retry = await supabase.from("follows").insert({
                        follower_id: currentUserId,
                        following_id: userId,
                    });
                    error = retry.error;
                }

                if (error) throw error;

                // DB trigger creates the notification row; send push notification best-effort
                const { data: currentUserProfile } = await supabase
                    .from('profiles')
                    .select('full_name, username')
                    .eq('id', currentUserId)
                    .single();

                const actorName = currentUserProfile?.full_name || currentUserProfile?.username || "Someone";
                sendPushNotification(userId, `${actorName} started following you`).catch(() => {});

                setIsFollowing(true);
                toast({
                    title: "Following",
                    description: "You are now following this user",
                });
            }

            onFollowChange?.();
        } catch (error) {
            toast({
                title: "Error",
                description: (error as Error).message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    if (!currentUserId || currentUserId === userId) {
        return null;
    }

    return (
        <Button
            onClick={handleFollow}
            disabled={loading}
            variant={isFollowing ? "outline" : "default"}
            className={isFollowing ? "" : "gradient-primary text-white"}
            size="sm"
        >
            {isFollowing ? (
                <>
                    <UserMinus className="w-4 h-4 mr-2" />
                    Unfollow
                </>
            ) : (
                <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Follow
                </>
            )}
        </Button>
    );
};
