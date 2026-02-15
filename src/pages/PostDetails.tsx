import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FeedPost } from "@/components/FeedPost";
import { PostSkeleton } from "@/components/PostSkeleton";
import { BottomNav } from "@/components/BottomNav";
import type { User } from "@supabase/supabase-js";
import { sendPushNotification } from "@/utils/notifications";

interface Post {
    id: string;
    content: string;
    image_url: string | null;
    video_url: string | null;
    user_id: string;
    created_at: string;
    profiles: {
        username: string;
        full_name: string;
        avatar_url: string | null;
        is_verified?: boolean | null;
    };
    likes: { id: string; user_id: string }[];
    comments: { id: string }[];
    saves?: { id: string; user_id: string }[];
}

const PostDetails = () => {
    const { postId } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setUser(session.user);
            }
        };
        checkAuth();
    }, []);

    useEffect(() => {
        if (postId) {
            fetchPost();
        }
    }, [postId]);

    const fetchPost = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('posts')
                .select(`
                    *,
                    profiles(username, full_name, avatar_url, is_verified),
                    likes(id, user_id),
                    comments(id),
                    saves(id, user_id)
                `)
                .eq('id', postId)
                .single();

            if (error) throw error;
            setPost(data);
        } catch (error) {
            console.error("Error fetching post:", error);
            toast({
                title: "Error",
                description: "Could not load post details",
                variant: "destructive"
            });
            navigate(-1);
        } finally {
            setLoading(false);
        }
    };

    const toggleLike = useCallback(async (postId: string, isLiked: boolean) => {
        if (!user || !post) return;

        // Optimistic update
        setPost(currentPost => {
            if (!currentPost) return null;
            if (isLiked) {
                return { ...currentPost, likes: currentPost.likes.filter(like => like.user_id !== user.id) };
            } else {
                return { ...currentPost, likes: [...currentPost.likes, { id: 'temp-id', user_id: user.id }] };
            }
        });

        try {
            if (isLiked) {
                const { data: likeData } = await supabase
                    .from('likes')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('post_id', postId)
                    .maybeSingle();

                if (likeData) {
                    await supabase.from('likes').delete().eq('id', likeData.id);
                }
            } else {
                await supabase.from('likes').insert({
                    user_id: user.id,
                    post_id: postId,
                });

                if (post.user_id !== user.id) {
                    const actorName = user.user_metadata.full_name || user.email?.split('@')[0] || "Someone";
                    await sendPushNotification(post.user_id, `${actorName} liked your post`);
                }
            }
        } catch (error) {
            console.error(error);
            fetchPost(); // Revert on error
        }
    }, [user, post]);

    const toggleSave = useCallback(async (postId: string, isSaved: boolean) => {
        if (!user || !post) return;

        // Optimistic update
        setPost(currentPost => {
            if (!currentPost) return null;
            if (isSaved) {
                const newSaves = currentPost.saves ? currentPost.saves.filter(save => save.user_id !== user.id) : [];
                return { ...currentPost, saves: newSaves };
            } else {
                const newSaves = currentPost.saves ? [...currentPost.saves, { id: 'temp-id', user_id: user.id }] : [{ id: 'temp-id', user_id: user.id }];
                return { ...currentPost, saves: newSaves };
            }
        });

        try {
            if (isSaved) {
                const { data: saveData } = await supabase
                    .from('saves')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('post_id', postId)
                    .maybeSingle();

                if (saveData) {
                    await supabase.from('saves').delete().eq('id', saveData.id);
                }
            } else {
                await supabase.from('saves').insert({
                    user_id: user.id,
                    post_id: postId,
                });

                if (post.user_id !== user.id) {
                    const actorName = user.user_metadata.full_name || user.email?.split('@')[0] || "Someone";
                    await sendPushNotification(post.user_id, `${actorName} saved your post`);
                }
            }
        } catch (error) {
            console.error(error);
            fetchPost();
        }
    }, [user, post]);

    const handleShare = (post: Post) => {
        const shareData = {
            title: `Post by ${post.profiles.full_name}`,
            text: post.content,
            url: window.location.href,
        };

        if (navigator.share) {
            navigator.share(shareData).catch(console.error);
        } else {
            navigator.clipboard.writeText(window.location.href);
            toast({
                title: "Link copied!",
                description: "Share link copied to clipboard.",
            });
        }
    };

    const handleReport = useCallback(async (postId: string, reason: string, details: string) => {
        if (!user) return;
        try {
            const { error } = await (supabase.from('reports') as any).insert({
                reporter_id: user.id,
                target_id: postId,
                target_type: 'post',
                reason: `${reason}: ${details}`.trim()
            });

            if (error) throw error;
            toast({
                title: "Report Submitted",
                description: "Thank you for helping keep the community safe.",
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            });
        }
    }, [user, toast]);

    const handleBlock = useCallback(async (targetUserId: string) => {
        if (!user) return;
        try {
            const { error } = await supabase.from('blocks').insert({
                blocker_id: user.id,
                blocked_id: targetUserId
            });

            if (error) throw error;
            toast({
                title: "User Blocked",
                description: "You will no longer see their posts.",
            });
            navigate('/feed');
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            });
        }
    }, [user, toast, navigate]);

    const handleDeletePost = async (postId: string) => {
        try {
            const { error } = await supabase.from('posts').delete().eq('id', postId);
            if (error) throw error;
            toast({
                title: "Post deleted",
                description: "Your post has been deleted successfully.",
            });
            navigate(-1);
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-card border-b border-border backdrop-blur-lg">
                <div className="p-4 flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <h1 className="text-xl font-bold">Post Details</h1>
                </div>
            </div>

            {/* Content */}
            <main className="max-w-2xl mx-auto px-4 py-6">
                {loading ? (
                    <PostSkeleton />
                ) : post ? (
                    <FeedPost
                        post={post}
                        currentUser={user}
                        onLike={toggleLike}
                        onSave={toggleSave}
                        onShare={handleShare}
                        onDelete={handleDeletePost}
                        onReport={handleReport}
                        onBlock={handleBlock}
                        index={0}
                    />
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        Post not found
                    </div>
                )}
            </main>

            <BottomNav />
        </div>
    );
};

export default PostDetails;
