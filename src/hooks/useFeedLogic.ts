import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

export interface Post {
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
    updated_at?: string;
}

const PAGE_SIZE = 5;

// Throttle utility
const throttle = <T extends (...args: any[]) => any>(func: T, limit: number) => {
    let inThrottle: boolean;
    let lastResult: ReturnType<T>;
    return function (this: any, ...args: Parameters<T>) {
        if (!inThrottle) {
            lastResult = func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
        return lastResult;
    }
}

export const useFeedLogic = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [unreadCount, setUnreadCount] = useState(0);

    // Auth State
    const { data: user } = useQuery({
        queryKey: ["auth_user"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate("/auth");
                return null;
            }
            return user;
        },
        staleTime: 1000 * 60 * 30, // 30 minutes
    });

    // Profile State
    const { data: userProfile } = useQuery({
        queryKey: ["user_profile", user?.id],
        queryFn: async () => {
            if (!user) return null;
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!user,
    });

    // Infinite Query for Posts
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isLoading,
        isFetchingNextPage,
        refetch
    } = useInfiniteQuery({
        queryKey: ["posts_feed"],
        queryFn: async ({ pageParam = 0 }) => {
            const from = (pageParam as number);
            const to = from + PAGE_SIZE - 1;

            const { data, error } = await supabase
                .from("posts")
                .select(`
          *,
          profiles:user_id (username, full_name, avatar_url, is_verified),
          likes (id, user_id),
          comments (id),
          saves (id, user_id)
        `)
                .order("created_at", { ascending: false })
                .range(from, to);

            if (error) {
                toast({ title: "Error", description: error.message, variant: "destructive" });
                return { posts: [], nextCursor: null };
            }

            // Handle empty feed with demo posts if needed
            if ((!data || data.length === 0) && from === 0) {
                return {
                    posts: [
                        {
                            id: 'demo-1',
                            content: 'Welcome to FutoraOne! This is a demo post to get you started. Share your thoughts with the world! 🚀',
                            image_url: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=800&auto=format&fit=crop',
                            video_url: null,
                            user_id: 'system',
                            created_at: new Date().toISOString(),
                            profiles: { username: 'futora', full_name: 'Futora Team', avatar_url: null, is_verified: true },
                            likes: [],
                            comments: [],
                            saves: []
                        }
                    ],
                    nextCursor: null
                };
            }

            return {
                posts: data as Post[],
                nextCursor: data.length === PAGE_SIZE ? to + 1 : null
            };
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        initialPageParam: 0,
        staleTime: 1000 * 60 * 2, // 2 minutes
    });

    const posts = useMemo(() => data?.pages.flatMap(page => page.posts) || [], [data]);

    // Real-time Subscriptions
    useEffect(() => {
        if (!user) return;

        const postChannel = supabase
            .channel("feed-updates")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, () => {
                setUnreadCount(prev => prev + 1);
            })
            .on("postgres_changes" as any, { event: "DELETE", schema: "public", table: "posts" }, (payload: { old: { id: string } }) => {
                queryClient.setQueryData(["posts_feed"], (old: { pages: { posts: Post[] }[] } | undefined) => {
                    if (!old) return old;
                    return {
                        ...old,
                        pages: old.pages.map((page) => ({
                            ...page,
                            posts: page.posts.filter((p: Post) => p.id !== payload.old.id)
                        }))
                    };
                });
            })
            .subscribe();

        const profileChannel = supabase
            .channel("profile-sync")
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" },
                throttle((payload: { new: { id: string; username: string; full_name: string; avatar_url: string | null } }) => {
                    queryClient.setQueryData(["posts_feed"], (old: { pages: { posts: Post[] }[] } | undefined) => {
                        if (!old) return old;
                        return {
                            ...old,
                            pages: old.pages.map((page) => ({
                                ...page,
                                posts: page.posts.map((post: Post) => {
                                    if (post.user_id === payload.new.id) {
                                        return {
                                            ...post,
                                            profiles: {
                                                ...post.profiles,
                                                username: payload.new.username,
                                                full_name: payload.new.full_name,
                                                avatar_url: payload.new.avatar_url
                                            }
                                        };
                                    }
                                    return post;
                                })
                            }))
                        };
                    });
                }, 2000)
            )
            .subscribe();

        return () => {
            supabase.removeChannel(postChannel);
            supabase.removeChannel(profileChannel);
        };
    }, [user, queryClient]);

    const toggleLike = useCallback(async (postId: string, isLiked: boolean) => {
        if (!user) return;

        // Optimistic Update
        queryClient.setQueryData(["posts_feed"], (old: { pages: { posts: Post[] }[] } | undefined) => {
            if (!old) return old;
            return {
                ...old,
                pages: old.pages.map((page) => ({
                    ...page,
                    posts: page.posts.map((post: Post) => {
                        if (post.id === postId) {
                            const newLikes = isLiked
                                ? post.likes.filter(l => l.user_id !== user.id)
                                : [...post.likes, { id: 'temp', user_id: user.id }];
                            return { ...post, likes: newLikes };
                        }
                        return post;
                    })
                }))
            };
        });

        try {
            if (isLiked) {
                await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", user.id);
            } else {
                await supabase.from("likes").insert({ post_id: postId, user_id: user.id });
            }
        } catch (error) {
            queryClient.invalidateQueries({ queryKey: ["posts_feed"] });
            toast({ title: "Error", description: "Failed to update like", variant: "destructive" });
        }
    }, [user, queryClient, toast]);

    const toggleSave = useCallback(async (postId: string, isSaved: boolean) => {
        if (!user) return;

        // Optimistic Update
        queryClient.setQueryData(["posts_feed"], (old: { pages: { posts: Post[] }[] } | undefined) => {
            if (!old) return old;
            return {
                ...old,
                pages: old.pages.map((page) => ({
                    ...page,
                    posts: page.posts.map((post: Post) => {
                        if (post.id === postId) {
                            const newSaves = isSaved
                                ? (post.saves || []).filter(s => s.user_id !== user.id)
                                : [...(post.saves || []), { id: 'temp', user_id: user.id }];
                            return { ...post, saves: newSaves };
                        }
                        return post;
                    })
                }))
            };
        });

        try {
            if (isSaved) {
                await supabase.from("saves").delete().eq("post_id", postId).eq("user_id", user.id);
            } else {
                await supabase.from("saves").insert({ post_id: postId, user_id: user.id });
            }
        } catch (error) {
            queryClient.invalidateQueries({ queryKey: ["posts_feed"] });
            toast({ title: "Error", description: "Failed to update save", variant: "destructive" });
        }
    }, [user, queryClient, toast]);

    const handleShare = useCallback((post: Post) => {
        if (navigator.share) {
            navigator.share({
                title: `Post by ${post.profiles.username}`,
                text: post.content,
                url: `${window.location.origin}/post/${post.id}`
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
            toast({ title: "Link copied!", description: "Post link copied to clipboard." });
        }
    }, [toast]);

    const handleDeletePost = useCallback(async (postId: string) => {
        const { error } = await supabase.from("posts").delete().eq("id", postId);
        if (error) {
            toast({ title: "Error", description: "Could not delete post", variant: "destructive" });
        } else {
            queryClient.invalidateQueries({ queryKey: ["posts_feed"] });
            toast({ title: "Success", description: "Post deleted" });
        }
    }, [queryClient, toast]);

    return {
        user,
        userProfile,
        posts,
        loading: isLoading || isFetchingNextPage,
        hasMore: hasNextPage,
        unreadCount,
        loadMore: fetchNextPage,
        toggleLike,
        toggleSave,
        handleShare,
        handleDeletePost,
        refetchFeed: refetch
    };
};
