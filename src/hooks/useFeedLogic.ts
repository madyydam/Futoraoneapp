import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getPostsFromCache, savePostsToCache } from "@/utils/cache";
import { triggerHeartConfetti } from "@/utils/confetti";
import { sendPushNotification } from "@/utils/notifications";
import { DEMO_POSTS } from "@/constants/feedData";
import type { User } from "@supabase/supabase-js";

interface Post {
    id: string;
    content: string;
    image_url: string | null;
    video_url: string | null;
    user_id: string;
    created_at: string;
    updated_at?: string;
    is_project_update?: boolean;
    project_id?: string | null;
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

// Define cache type
interface CachedProfile {
    xp: number;
    level: number;
    current_streak: number;
    longest_streak: number;
    daily_challenges: unknown; // Keep specific any if structure is unknown or complex json
}

const profileCache = new Map<string, CachedProfile>();

export const useFeedLogic = () => {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<{ xp: number; level: number; current_streak: number } | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const pageRef = useRef(0);
    const [hasMore, setHasMore] = useState(true);
    const POSTS_PER_PAGE = 10;
    const [unreadCount, setUnreadCount] = useState(0);
    const navigate = useNavigate();
    const { toast } = useToast();

    // --- Helper Functions ---

    const fetchUserProfile = useCallback(async (userId: string) => {
        if (profileCache.has(userId)) {
            // Safe to cast as defined logic handles it
            setUserProfile(profileCache.get(userId) as { xp: number; level: number; current_streak: number });
            return;
        }

        // Cache cleanup: prevent unbounded growth
        if (profileCache.size > 100) {
            const oldestKey = profileCache.keys().next().value;
            profileCache.delete(oldestKey);
        }

        // Mark daily check-in (streak update) for the current user
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser && authUser.id === userId) {
            // Use safe RPC call, casting as any because the type is not generated
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase.rpc as any)('check_in_streak').then(({ error }: any) => {
                if (error) console.error('Streak check-in error:', error);
            });
        }

        // Select specific columns to be safe, but handle missing columns gracefully
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (error) {
            console.warn("Error fetching user profile stats:", error.message);
            return;
        }

        if (data) {
            // Handle potentially missing columns from older schemas with defined defaults
            // Using unknown cast first to avoid 'any' lint errors if possible, 
            // but relying on partial shape since Supabase types might be strict
            const profileData = data as Record<string, unknown>;

            const formattedProfile = {
                xp: profileData.xp || 0,
                level: profileData.level || 1,
                current_streak: profileData.current_streak || 0,
                longest_streak: profileData.longest_streak || 0,
                daily_challenges: profileData.daily_challenges || null
            };
            profileCache.set(userId, formattedProfile);
            setUserProfile(formattedProfile);
        }
    }, []);

    const fetchPosts = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('posts')
                .select('*, profiles(username, full_name, avatar_url, is_verified), likes(id, user_id), comments(id), saves(id, user_id)')
                .order('created_at', { ascending: false })
                .range(pageRef.current * POSTS_PER_PAGE, (pageRef.current + 1) * POSTS_PER_PAGE - 1);

            if (error) throw error;

            const formattedPosts: Post[] = (data || []).map(post => ({
                ...post,
                likes: post.likes || [],
                comments: post.comments || [],
                saves: post.saves || []
            }));

            if (pageRef.current === 0) {
                setPosts(formattedPosts);
                savePostsToCache(formattedPosts.slice(0, 20));
            } else {
                setPosts(prev => [...prev, ...formattedPosts]);
            }

            if (formattedPosts.length < POSTS_PER_PAGE) {
                setHasMore(false);
            }
        } catch (error) {
            const err = error as Error;
            console.error('Error fetching posts:', err);
            toast({
                title: "Error loading posts",
                description: "Could not connect to database. Showing cached posts.",
                variant: "destructive",
            });
            if (pageRef.current === 0) {
                const cached = await getPostsFromCache();
                if (cached) setPosts(cached);
            }
        } finally {
            setLoading(false);
        }
    }, [toast]);

    const fetchUnreadCount = useCallback(async () => {
        if (!user) return;
        const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false);
        setUnreadCount(count || 0);
    }, [user]);

    // --- Effects ---

    useEffect(() => {
        let mounted = true;

        // Safety timeout to prevent infinite loading
        const safetyTimeout = setTimeout(() => {
            if (mounted && loading) {
                console.warn("Feed loading timed out, forcing UI unlock");
                setLoading(false);
            }
        }, 8000); // 8 seconds timeout

        // Check authentication
        const checkAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                if (!session) {
                    if (mounted) navigate("/auth");
                } else {
                    if (mounted) {
                        setUser(session.user);
                        fetchUserProfile(session.user.id);
                    }
                }
            } catch (e) {
                console.error("Auth check failed:", e);
                if (mounted) {
                    navigate("/auth");
                    setLoading(false);
                }
            }
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (mounted) {
                if (!session) {
                    navigate("/auth");
                } else {
                    setUser(session.user);
                    fetchUserProfile(session.user.id);
                }
            }
        });

        return () => {
            mounted = false;
            clearTimeout(safetyTimeout);
            subscription.unsubscribe();
        };
    }, [navigate, toast, fetchUserProfile]); // removed loading from deps to avoid re-triggering timeout loop, added fetchUserProfile

    // Separate effect for data fetching
    useEffect(() => {
        let mounted = true;

        if (user) {
            const initFeed = async () => {
                // 1. Load Cache First (Fastest) for immediate UI
                try {
                    const cachedPosts = (await getPostsFromCache()) as any;
                    if (mounted && cachedPosts && cachedPosts.length > 0) {
                        cachedPosts.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                        setPosts(cachedPosts);
                        // If we have cache, we can stop loading spinner immediately to show content
                        setLoading(false);
                    }
                } catch (e) {
                    console.error("Cache load error", e);
                }

                // 2. Fetch Fresh Data (Network)
                if (mounted) {
                    fetchPosts();
                    fetchUnreadCount();
                }
            };

            initFeed();

            const channel = supabase
                .channel('posts-changes')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'posts'
                    },
                    (payload) => {
                        const newPost = payload.new as Post;
                        supabase
                            .from('posts')
                            .select(`
                                *,
                                profiles(username, full_name, avatar_url, is_verified),
                                likes(id, user_id),
                                comments(id),
                                saves(id, user_id)
                            `)
                            .eq('id', newPost.id)
                            .single()
                            .then(({ data }) => {
                                if (data && mounted) {
                                    const formattedPost: Post = {
                                        ...data,
                                        likes: data.likes || [],
                                        comments: data.comments || [],
                                        saves: data.saves || []
                                    };
                                    setPosts(prev => {
                                        if (prev.some(p => p.id === formattedPost.id)) return prev;
                                        return [formattedPost, ...prev];
                                    });
                                }
                            });
                    }
                )
                .subscribe();

            const notificationChannel = supabase
                .channel('notifications-count')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}`
                    },
                    () => {
                        if (mounted) fetchUnreadCount();
                    }
                )
                .subscribe();

            const profileChannel = supabase
                .channel('profile-sync')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'profiles'
                    },
                    (payload) => {
                        console.log('Real-time profile update in Feed:', payload);
                        const updatedProfile = (payload.new || payload.old) as any;
                        if (!updatedProfile || !updatedProfile.id) return;

                        if (mounted) {
                            // Update cache
                            if (profileCache.has(updatedProfile.id)) {
                                console.log(`Updating profile cache for ${updatedProfile.id}`);
                                profileCache.set(updatedProfile.id, {
                                    xp: updatedProfile.xp || 0,
                                    level: updatedProfile.level || 1,
                                    current_streak: updatedProfile.current_streak || 0,
                                    longest_streak: updatedProfile.longest_streak || 0,
                                    daily_challenges: updatedProfile.daily_challenges || null
                                });
                            }

                            // Update posts that belong to this profile
                            setPosts(currentPosts => {
                                const needsUpdate = currentPosts.some(p => p.user_id === updatedProfile.id);
                                if (!needsUpdate) return currentPosts;

                                console.log(`Updating ${currentPosts.filter(p => p.user_id === updatedProfile.id).length} posts for user ${updatedProfile.id}. is_verified: ${updatedProfile.is_verified}`);
                                return currentPosts.map(post => {
                                    if (post.user_id === updatedProfile.id) {
                                        return {
                                            ...post,
                                            profiles: {
                                                ...post.profiles,
                                                username: updatedProfile.username || post.profiles?.username,
                                                full_name: updatedProfile.full_name || post.profiles?.full_name,
                                                avatar_url: updatedProfile.avatar_url || post.profiles?.avatar_url,
                                                is_verified: updatedProfile.is_verified !== undefined ? updatedProfile.is_verified : post.profiles?.is_verified
                                            }
                                        };
                                    }
                                    return post;
                                });
                            });

                            // If it's the current user, update userProfile state
                            if (user && updatedProfile.id === user.id) {
                                console.log('Updating current user profile stats in feed state');
                                setUserProfile({
                                    xp: updatedProfile.xp || 0,
                                    level: updatedProfile.level || 1,
                                    current_streak: updatedProfile.current_streak || 0,
                                    longest_streak: updatedProfile.longest_streak || 0,
                                    daily_challenges: updatedProfile.daily_challenges || null
                                } as any);
                            }
                        }
                    }
                )
                .subscribe((status) => {
                    console.log(`Feed profiles subscription status: ${status}`);
                });

            return () => {
                mounted = false;
                supabase.removeChannel(channel);
                supabase.removeChannel(notificationChannel);
                supabase.removeChannel(profileChannel);
            };
        }
    }, [user, fetchPosts, fetchUnreadCount]);


    // --- Actions ---

    const toggleLike = useCallback(async (postId: string, isLiked: boolean) => {
        if (!user) return;

        const isDemoPost = postId.startsWith('demo-post-');

        // Optimistic update with functional state
        setPosts(currentPosts => currentPosts.map(post => {
            if (post.id === postId) {
                const newLikes = isLiked
                    ? (post.likes || []).filter(like => like.user_id !== user.id)
                    : [...(post.likes || []), { id: 'temp-id', user_id: user.id }];
                return { ...post, likes: newLikes };
            }
            return post;
        }));

        if (isDemoPost) {
            if (!isLiked) triggerHeartConfetti();
            return;
        }

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
                triggerHeartConfetti();
                await supabase.from('likes').insert({
                    user_id: user.id,
                    post_id: postId,
                });

                const { data: postData } = await supabase
                    .from('posts')
                    .select('user_id')
                    .eq('id', postId)
                    .maybeSingle();

                if (postData && postData.user_id !== user.id) {
                    const actorName = user.user_metadata?.full_name || user.email?.split('@')[0] || "Someone";
                    sendPushNotification(postData.user_id, `${actorName} liked your post`).catch(console.error);
                }
            }
        } catch (error: any) {
            console.error('Like error:', error);
            // Revert optimistic update on error
            setPosts(currentPosts => currentPosts.map(post => {
                if (post.id === postId) {
                    const newLikes = !isLiked
                        ? (post.likes || []).filter(like => like.user_id !== user.id)
                        : [...(post.likes || []), { id: 'temp-id', user_id: user.id }];
                    return { ...post, likes: newLikes };
                }
                return post;
            }));
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        }
    }, [user, toast]);

    const toggleSave = useCallback(async (postId: string, isSaved: boolean) => {
        if (!user) return;

        const isDemoPost = postId.startsWith('demo-post-');

        // Optimistic update with functional state
        setPosts(currentPosts => currentPosts.map(post => {
            if (post.id === postId) {
                const newSaves = isSaved
                    ? (post.saves || []).filter(save => save.user_id !== user.id)
                    : [...(post.saves || []), { id: 'temp-id', user_id: user.id }];
                return { ...post, saves: newSaves };
            }
            return post;
        }));

        if (isDemoPost) return;

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

                const { data: postData } = await supabase
                    .from('posts')
                    .select('user_id')
                    .eq('id', postId)
                    .maybeSingle();

                if (postData && postData.user_id !== user.id) {
                    const actorName = user.user_metadata?.full_name || user.email?.split('@')[0] || "Someone";
                    sendPushNotification(postData.user_id, `${actorName} saved your post`).catch(console.error);
                }
            }
        } catch (error: any) {
            console.error('Save error:', error);
            // Revert optimistic update on error
            setPosts(currentPosts => currentPosts.map(post => {
                if (post.id === postId) {
                    const newSaves = !isSaved
                        ? (post.saves || []).filter(save => save.user_id !== user.id)
                        : [...(post.saves || []), { id: 'temp-id', user_id: user.id }];
                    return { ...post, saves: newSaves };
                }
                return post;
            }));
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        }
    }, [user, toast]);

    const handleShare = useCallback(async (post: Post) => {
        const shareData = {
            title: `Post by ${post.profiles.full_name}`,
            text: post.content,
            url: window.location.href,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (error) {
                console.log('Error sharing:', error);
            }
        } else {
            navigator.clipboard.writeText(window.location.href);
            toast({
                title: "Link copied!",
                description: "Share link copied to clipboard.",
            });
        }
    }, [toast]);

    const handleDeletePost = useCallback(async (postId: string) => {
        try {
            const { error } = await supabase.from('posts').delete().eq('id', postId);
            if (error) throw error;
            toast({
                title: "Post deleted",
                description: "Your post has been deleted successfully.",
            });
            setPosts(prev => prev.filter(post => post.id !== postId));
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        }
    }, [toast]);

    const handleLogout = useCallback(async () => {
        await supabase.auth.signOut();
        navigate("/");
    }, [navigate]);

    const loadMore = useCallback(() => {
        if (!loading && hasMore) {
            pageRef.current += 1;
            fetchPosts();
        }
    }, [loading, hasMore, fetchPosts]);

    return useMemo(() => ({
        user,
        userProfile,
        posts,
        loading,
        hasMore,
        unreadCount,
        setPosts,
        loadMore,
        fetchPosts,
        toggleLike,
        toggleSave,
        handleShare,
        handleDeletePost,
        handleLogout
    }), [user, userProfile, posts, loading, hasMore, unreadCount, loadMore, fetchPosts, toggleLike, toggleSave, handleShare, handleDeletePost, handleLogout]);
};

export type { Post };
