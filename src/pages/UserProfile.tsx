import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Shield } from "lucide-react";
import { motion } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { BottomNav } from "@/components/BottomNav";
import { FollowersModal } from "@/components/FollowersModal";
import { useTrackProfileView } from "@/hooks/useProfileViews";
import { useMutualFollowers } from "@/hooks/useMutualFollowers";
import { MutualFollowersModal } from "@/components/MutualFollowersModal";
import { BlockUserDialog } from "@/components/BlockUserDialog";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { CartoonLoader } from "@/components/CartoonLoader";

import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { SEO } from "@/components/SEO";

interface Profile {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    bio: string | null;
    location: string | null;
    github_url: string | null;
    linkedin_url: string | null;
    portfolio_url: string | null;
    tech_skills: string[] | null;
    is_verified?: boolean | null;
    verification_category?: string | null;
    theme_color?: string | null;
    badges?: string[] | null;
    trust_score?: number | null;
    balance?: number;
}

interface Project {
    id: string;
    title: string;
    description: string;
    tech_stack: string[];
    project_likes: { id: string }[];
}

interface Post {
    id: string;
    content: string;
    image_url: string | null;
    created_at: string;
    likes: { id: string }[];
    comments: { id: string }[];
}

interface Review {
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    reviewer: {
        username: string;
        avatar_url: string | null;
    };
}

const UserProfile = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { isAdmin } = useIsAdmin();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<Project[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [followersModalOpen, setFollowersModalOpen] = useState(false);
    const [followersModalTab, setFollowersModalTab] = useState<"followers" | "following">("followers");
    const [mutualModalOpen, setMutualModalOpen] = useState(false);

    const [isBlocked, setIsBlocked] = useState(false);
    const [showBlockDialog, setShowBlockDialog] = useState(false);

    useTrackProfileView(userId, currentUser?.id);
    const { mutualCount } = useMutualFollowers(currentUser?.id, userId);

    const fetchFollowerCounts = useCallback(async () => {
        if (!userId) return;

        const [followersResult, followingResult] = await Promise.all([
            supabase
                .from("follows")
                .select("*", { count: "exact", head: true })
                .eq("following_id", userId),
            supabase
                .from("follows")
                .select("*", { count: "exact", head: true })
                .eq("follower_id", userId)
        ]);

        setFollowerCount(followersResult.count || 0);
        setFollowingCount(followingResult.count || 0);
    }, [userId]);

    useEffect(() => {
        if (currentUser && userId) {
            checkBlockStatus();
        }
    }, [currentUser, userId]);

    const checkBlockStatus = async () => {
        if (!currentUser || !userId) return;

        const { data } = await supabase
            .from('blocks')
            .select('*')
            .eq('blocker_id', currentUser.id)
            .eq('blocked_id', userId)
            .maybeSingle();

        setIsBlocked(!!data);
    };

    const handleBlock = async () => {
        if (!currentUser || !userId) return;

        const { error } = await supabase
            .from('blocks')
            .insert({
                blocker_id: currentUser.id,
                blocked_id: userId
            });

        if (error) {
            toast({
                title: "Error",
                description: "Failed to block user",
                variant: "destructive",
            });
        } else {
            setIsBlocked(true);
            toast({
                title: "User blocked",
                description: "You will no longer receive messages from this user.",
            });
        }
    };

    const handleUnblock = async () => {
        if (!currentUser || !userId) return;

        const { error } = await supabase
            .from('blocks')
            .delete()
            .eq('blocker_id', currentUser.id)
            .eq('blocked_id', userId);

        if (error) {
            toast({
                title: "Error",
                description: "Failed to unblock user",
                variant: "destructive",
            });
        } else {
            setIsBlocked(false);
            toast({
                title: "User unblocked",
                description: "You can now receive messages from this user.",
            });
        }
    };

    const handleVerifyUser = async () => {
        if (!userId || !isAdmin) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    is_verified: true,
                    verification_category: 'admin'
                })
                .eq('id', userId);

            if (error) throw error;

            toast({
                title: "✅ User Verified!",
                description: "The user has been successfully verified.",
            });

            const { data: updatedProfile } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .single();

            if (updatedProfile) {
                setProfile(prev => prev ? { ...prev, ...updatedProfile } : null);
            }
        } catch (error) {
            console.error('Error verifying user:', error);
            toast({
                title: "Error",
                description: "Failed to verify user",
                variant: "destructive",
            });
        }
    };

    const handleRemoveVerification = async () => {
        if (!userId || !isAdmin) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    is_verified: false,
                    verification_category: null
                })
                .eq('id', userId);

            if (error) throw error;

            toast({
                title: "Verification Removed",
                description: "The user's verification has been removed.",
            });

            const { data: updatedProfile } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .single();

            if (updatedProfile) {
                setProfile(prev => prev ? { ...prev, ...updatedProfile } : null);
            }
        } catch (error) {
            console.error('Error removing verification:', error);
            toast({
                title: "Error",
                description: "Failed to remove verification",
                variant: "destructive",
            });
        }
    };

    const fetchData = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);

        if (!userId) {
            navigate("/feed");
            return;
        }

        const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();

        if (profileError || !profileData) {
            toast({
                title: "Error",
                description: "User not found",
                variant: "destructive",
            });
            navigate("/feed");
            return;
        }

        // Sanu's special profile customization
        const isSanu = profileData.username?.toLowerCase() === 'sanu';



        const enhancedProfile: Profile = {
            id: profileData.id,
            username: profileData.username,
            full_name: profileData.full_name,
            avatar_url: profileData.avatar_url,
            bio: profileData.bio,
            location: profileData.location,
            github_url: profileData.github_url,
            linkedin_url: profileData.linkedin_url,
            portfolio_url: profileData.portfolio_url,
            tech_skills: profileData.tech_skills,
            verification_category: isSanu ? 'creator' : profileData.verification_category,
            is_verified: isSanu ? true : profileData.is_verified,
            theme_color: isSanu ? '#FFE6EA' : undefined,
        };

        // Fetch wallet balance
        let walletBalance = 0;
        const { data: walletData } = await supabase
            .from('native_wallets')
            .select('balance')
            .eq('user_id', userId)
            .maybeSingle();

        if (walletData) {
            walletBalance = walletData.balance;
        }

        // Extending the local Profile interface to include balance
        const visibleProfile = { ...enhancedProfile, balance: walletBalance };
        setProfile(visibleProfile);

        // Fetch all data in parallel for better performance
        const [projectsResult, postsResult] = await Promise.all([
            supabase
                .from("projects")
                .select(`
                    *,
                    project_likes(id)
                `)
                .eq("user_id", userId)
                .order('created_at', { ascending: false }),
            supabase
                .from("posts")
                .select(`
                    *,
                    likes(id),
                    comments(id)
                `)
                .eq("user_id", userId)
                .order('created_at', { ascending: false })
        ]);

        setProjects((projectsResult.data as unknown as Project[]) || []);
        setPosts((postsResult.data as unknown as Post[]) || []);
        setReviews([]); // Reviews table doesn't exist, so empty array

        await fetchFollowerCounts();
        setLoading(false);
    }, [userId, navigate, toast, fetchFollowerCounts]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return <CartoonLoader />;
    }

    return (
        <div
            className="min-h-screen pb-24 transition-colors duration-300"
            style={{
                backgroundColor: profile?.theme_color || 'hsl(var(--background))'
            }}
        >
            <SEO
                title={profile?.full_name ? `${profile.full_name} (@${profile.username})` : "User Profile"}
                description={profile?.bio || `Check out ${profile?.full_name || 'this user'}'s profile on Futora.`}
                image={profile?.avatar_url || undefined}
            />
            <div className="relative h-32 w-full">
                {!profile?.theme_color && <div className="absolute inset-0 gradient-primary" />}
                {profile?.theme_color && <div className="absolute inset-0 bg-black/5" />}
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 left-4 text-foreground hover:bg-black/10"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft className="w-6 h-6" />
                </Button>
            </div>

            <div className="px-3 sm:px-4 -mt-12 sm:-mt-16 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                >
                    <ProfileHeader
                        profile={profile}
                        currentUser={currentUser}
                        userId={userId!}
                        mutualCount={mutualCount}
                        isAdmin={isAdmin}
                        isBlocked={isBlocked}
                        onFollowChange={fetchFollowerCounts}
                        onMutualClick={() => setMutualModalOpen(true)}
                        onVerifyUser={handleVerifyUser}
                        onRemoveVerification={handleRemoveVerification}
                        onBlockUser={() => setShowBlockDialog(true)}
                        onUnblockUser={handleUnblock}
                    />

                    <Card className="bg-card/80 backdrop-blur-sm border-border">
                        <CardContent className="p-4">
                            <ProfileStats
                                projectsCount={projects.length}
                                followerCount={followerCount}
                                followingCount={followingCount}
                                onFollowersClick={() => {
                                    setFollowersModalTab("followers");
                                    setFollowersModalOpen(true);
                                }}
                                onFollowingClick={() => {
                                    setFollowersModalTab("following");
                                    setFollowersModalOpen(true);
                                }}
                            />
                        </CardContent>
                    </Card>

                    {profile?.tech_skills && profile.tech_skills.length > 0 && (
                        <Card className="bg-card/80 backdrop-blur-sm border-border">
                            <CardContent className="p-4">
                                <h3 className="font-semibold text-foreground mb-3">Tech Skills</h3>
                                <div className="flex flex-wrap gap-2">
                                    {profile.tech_skills.map((skill: string) => (
                                        <Badge key={skill} variant="secondary" className="bg-secondary text-secondary-foreground">
                                            {skill}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {profile?.badges && profile.badges.length > 0 && (
                        <Card className="bg-card/80 backdrop-blur-sm border-border">
                            <CardContent className="p-4">
                                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-yellow-500" />
                                    Badges & Certifications
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {profile.badges.map((badge: string) => (
                                        <Badge
                                            key={badge}
                                            variant="outline"
                                            className="bg-yellow-500/10 text-yellow-700 border-yellow-200 flex items-center gap-1 px-3 py-1"
                                        >
                                            <Shield className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                                            {badge}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <ProfileTabs
                        projects={projects}
                        posts={posts}
                        reviews={reviews}
                        profile={profile}
                    />
                </motion.div>
            </div>

            <FollowersModal
                open={followersModalOpen}
                onOpenChange={setFollowersModalOpen}
                userId={userId!}
                currentUserId={currentUser?.id}
                defaultTab={followersModalTab}
            />

            {currentUser?.id && userId && currentUser.id !== userId && (
                <MutualFollowersModal
                    open={mutualModalOpen}
                    onOpenChange={setMutualModalOpen}
                    currentUserId={currentUser.id}
                    profileUserId={userId}
                />
            )}

            <BlockUserDialog
                open={showBlockDialog}
                onOpenChange={setShowBlockDialog}
                onConfirm={() => {
                    handleBlock();
                    setShowBlockDialog(false);
                }}
                username={profile?.username || ""}
            />

            <BottomNav />
        </div>
    );
};

export default UserProfile;