import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Hash, TrendingUp } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

interface Post {
    id: string;
    content: string;
    created_at: string;
    profiles: {
        username: string;
        full_name: string;
        avatar_url: string | null;
    };
    likes: { id: string }[];
    comments: { id: string }[];
}

const TopicPage = () => {
    const { tag } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [postCount, setPostCount] = useState(0);
    const [isFollowing, setIsFollowing] = useState(false);
    const [loadingFollow, setLoadingFollow] = useState(false);

    const checkFollowStatus = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !tag) return;

            const { data } = await supabase
                .from('topic_follows' as any)
                .select('id')
                .eq('user_id', user.id)
                .eq('topic_tag', tag)
                .maybeSingle();

            setIsFollowing(!!data);
        } catch (error) {
            console.error("Error checking follow status:", error);
        }
    }, [tag]);

    const fetchTopicPosts = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('posts')
                .select(`
                    id,
                    content,
                    created_at,
                    profiles(username, full_name, avatar_url),
                    likes(id),
                    comments(id)
                `)
                .ilike('content', `%#${tag}%`)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            const postsList = (data as unknown as Post[]) || [];
            setPosts(postsList);
            setPostCount(postsList.length);
        } catch (error) {
            console.error("Error fetching topic posts:", error);
            toast({
                title: "Error loading posts",
                description: "Could not load posts for this topic",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }, [tag, toast]);

    useEffect(() => {
        fetchTopicPosts();
        checkFollowStatus();
    }, [tag, fetchTopicPosts, checkFollowStatus]);

    const handleFollow = async () => {
        try {
            setLoadingFollow(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                toast({
                    title: "Authentication required",
                    description: "Please sign in to follow topics",
                    variant: "destructive"
                });
                return;
            }

            if (!tag) return;

            if (isFollowing) {
                const { error } = await supabase
                    .from('topic_follows' as any)
                    .delete()
                    .eq('user_id', user.id)
                    .eq('topic_tag', tag);

                if (error) throw error;
                setIsFollowing(false);
                toast({
                    title: "Unfollowed",
                    description: `You are no longer following #${tag}`,
                });
            } else {
                const { error } = await supabase
                    .from('topic_follows' as any)
                    .insert({ user_id: user.id, topic_tag: tag });

                if (error) throw error;
                setIsFollowing(true);
                toast({
                    title: "Following",
                    description: `You are now following #${tag}`,
                });
            }
        } catch (error) {
            console.error("Error toggling follow:", error);
            toast({
                title: "Error",
                description: "Failed to update follow status",
                variant: "destructive"
            });
        } finally {
            setLoadingFollow(false);
        }
    };


    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-card border-b border-border backdrop-blur-lg">
                <div className="p-4">
                    <div className="flex items-center gap-4 mb-2">
                        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                            <ArrowLeft className="w-6 h-6" />
                        </Button>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <Hash className="w-6 h-6 text-primary" />
                                <h1 className="text-2xl font-bold text-foreground">{tag}</h1>
                            </div>
                            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                <TrendingUp className="w-4 h-4" />
                                {loading ? "Loading..." : `${postCount.toLocaleString()} posts`}
                            </p>
                        </div>
                        <Button
                            variant={isFollowing ? "outline" : "default"}
                            size="sm"
                            onClick={handleFollow}
                            disabled={loadingFollow}
                        >
                            {loadingFollow ? "..." : isFollowing ? "Following" : "Follow"}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                {loading ? (
                    Array(3).fill(0).map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-muted" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-muted rounded w-1/3" />
                                        <div className="h-3 bg-muted rounded w-1/4" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-4 bg-muted rounded" />
                                    <div className="h-4 bg-muted rounded w-5/6" />
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : posts.length === 0 ? (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <Hash className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="text-lg font-semibold mb-2">No posts found</h3>
                            <p className="text-muted-foreground mb-4">
                                Be the first to post about #{tag}!
                            </p>
                            <Button onClick={() => navigate('/create-post')}>
                                Create Post
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    posts.map((post, index) => (
                        <motion.div
                            key={post.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Card className="bg-card border-2 border-black/20 dark:border-border hover:border-primary transition-all cursor-pointer">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Avatar className="w-10 h-10">
                                            <AvatarImage src={post.profiles.avatar_url || undefined} />
                                            <AvatarFallback className="bg-primary/10 text-primary">
                                                {post.profiles.full_name?.[0]?.toUpperCase() || 'U'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <p className="font-semibold text-sm">{post.profiles.full_name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                @{post.profiles.username} · {new Date(post.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    <p className="text-sm mb-4 whitespace-pre-wrap">
                                        {post.content}
                                    </p>

                                    <div className="flex items-center gap-6 text-muted-foreground text-sm">
                                        <span className="flex items-center gap-1.5">
                                            ❤️ {post.likes?.length || 0}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            💬 {post.comments?.length || 0}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            🔁 {Math.floor(Math.random() * 50)}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))
                )}
            </div>

            <BottomNav />
        </div>
    );
};

export default TopicPage;
