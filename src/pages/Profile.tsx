import React, { useState, useEffect, useCallback, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Github, Linkedin, Instagram, Globe, MapPin, Edit, Eye, Shield, QrCode, Settings, MessageSquareWarning } from "lucide-react";
import { motion } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import { LogoutDialog } from "@/components/LogoutDialog";
import { useHelpTour } from "@/contexts/HelpTourContext";
import { BottomNav } from "@/components/BottomNav";
import { FollowersModal } from "@/components/FollowersModal";
import { ProfileProjects } from "@/components/ProfileProjects";
import { ProfilePosts } from "@/components/ProfilePosts";
import { ModeToggle } from "@/components/mode-toggle";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { QRCodeDialog } from "@/components/QRCodeDialog";
import { CartoonLoader } from "@/components/CartoonLoader";
import { AchievementShowcase } from "@/components/AchievementShowcase";
import { ProfileStatsCard } from "@/components/ProfileStatsCard";
import { WalletCard } from "@/components/rewards/WalletCard";

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  portfolio_url: string | null;
  tech_skills: string[] | null;
  banner_url: string | null;
  is_verified?: boolean | null;
  verification_category?: string | null;
  theme_color?: string | null;
  badges?: string[] | null;
  trust_score?: number | null;
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

// Social Link Button Component with smart click handling
interface SocialLinkButtonProps {
  url: string | null | undefined;
  icon: React.ReactNode;
  label: string;
  isOwnProfile: boolean;
  onEditProfile: () => void;
}

const SocialLinkButton = memo(({
  url,
  icon,
  label,
  isOwnProfile,
  onEditProfile,
}: SocialLinkButtonProps) => {
  const { toast } = useToast();

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();

    if (url) {
      // If URL exists, open it
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      // If URL doesn't exist
      if (isOwnProfile) {
        // Navigate to edit profile if it's user's own profile
        onEditProfile();
        toast({
          title: "Complete Your Profile",
          description: `Add your ${label} URL in the edit profile section.`,
        });
      } else {
        // Show "Not Connected" message for other users
        toast({
          title: "Not Connected",
          description: `This user hasn't connected their ${label} account yet.`,
          variant: "destructive",
        });
      }
    }
  }, [url, label, isOwnProfile, onEditProfile, toast]);

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`text-foreground hover:bg-primary/10 transition-colors ${!url ? 'opacity-50' : ''}`}
      onClick={handleClick}
    >
      {icon}
    </Button>
  );
});

SocialLinkButton.displayName = "SocialLinkButton";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useIsAdmin();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followersModalTab, setFollowersModalTab] = useState<"followers" | "following">("followers");
  const [qrCodeDialogOpen, setQrCodeDialogOpen] = useState(false);
  const { registerAction } = useHelpTour();

  // Register tour actions
  useEffect(() => {
    const unregisterEdit = registerAction("openEditProfile", () => setEditDialogOpen(true));
    const unregisterAvatar = registerAction("openAvatarEdit", () => navigate("/select-avatar"));
    const unregisterWallet = registerAction("openWallet", () => navigate("/wallet"));
    const unregisterLeaderboard = registerAction("openLeaderboard", () => navigate("/leaderboard"));

    return () => {
      unregisterEdit();
      unregisterAvatar();
      unregisterWallet();
      unregisterLeaderboard();
    };
  }, [registerAction, navigate]);

  const { data: profileData, isLoading, refetch } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const [profileResult, projectsResult, postsResult, followersResult, followingResult] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single(),
          supabase
            .from("projects")
            .select(`*, project_likes(id)`)
            .eq("user_id", user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from("posts")
            .select(`*, likes(id), comments(id)`)
            .eq("user_id", user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from("follows")
            .select("*", { count: "exact", head: true })
            .eq("following_id", user.id),
          supabase
            .from("follows")
            .select("*", { count: "exact", head: true })
            .eq("follower_id", user.id)
        ]);

      let profile = profileResult.data as unknown as Profile;

      // Apply custom theme for @sanu
      if (profile?.username?.toLowerCase() === 'sanu') {
        profile = {
          ...profile,
          verification_category: 'creator',
          theme_color: '#FFE6EA',
          is_verified: true
        };
      }

      return {
        profile,
        projects: (projectsResult.data as unknown as Project[]) || [],
        posts: (postsResult.data as unknown as Post[]) || [],
        followerCount: followersResult.count || 0,
        followingCount: followingResult.count || 0
      };
    },
    enabled: !!user?.id,
  });

  // Effects to sync query data to local state if needed, or just use data directly
  useEffect(() => {
    if (profileData) {
      setProfile(profileData.profile);
      setProjects(profileData.projects);
      setPosts(profileData.posts);
      setFollowerCount(profileData.followerCount);
      setFollowingCount(profileData.followingCount);
      setLoading(false);
    }
  }, [profileData]);

  // Auth check
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) navigate("/auth");
      else setUser(user);
    });
  }, [navigate]);

  const fetchFollowerCounts = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const refreshProfile = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleLogout = useCallback(async () => {
    setLogoutDialogOpen(true);
  }, []);

  const confirmLogout = useCallback(async () => {
    await supabase.auth.signOut();
    toast({ title: "Logged out successfully", description: "See you next time! 👋" });
    navigate("/");
  }, [toast, navigate]);

  if (loading || isLoading) {
    return <CartoonLoader />;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header with Cover */}
      <div
        className="relative h-32 w-full bg-cover bg-center"
        style={{
          backgroundImage: profile?.banner_url
            ? `url(${profile.banner_url})`
            : undefined,
          backgroundColor: profile?.theme_color || undefined
        }}
      >
        {!profile?.banner_url && !profile?.theme_color && <div className="absolute inset-0 gradient-primary" />}
      </div>

      <div className="px-3 sm:px-4 -mt-12 sm:-mt-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Profile Info */}
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div
                  className="relative cursor-pointer group"
                  id="edit-avatar-trigger"
                  onClick={() => navigate("/select-avatar")}
                >
                  <div className={`rounded-full transition-transform group-hover:scale-105 ${profile?.verification_category === 'creator'
                    ? "p-[3px] bg-gradient-to-tr from-[#FFD700] via-[#FDB931] to-[#C0B283] shadow-[0_0_15px_rgba(255,215,0,0.5)]"
                    : ""
                    }`}>
                    <Avatar className={`h-24 w-24 border-4 ${profile?.verification_category === 'creator' ? "border-white" : "border-background"}
                      }`}>
                      <AvatarImage src={profile?.avatar_url || undefined} loading="eager" />
                      <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                        {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div id="theme-toggle">
                    <ModeToggle />
                  </div>

                  <Button
                    id="edit-profile-btn"
                    variant="outline"
                    size="sm"
                    className="border-border text-foreground"
                    onClick={() => setEditDialogOpen(true)}
                  >
                    <Edit size={16} className="mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-border text-foreground w-9 h-9"
                    onClick={() => navigate("/settings")}
                  >
                    <Settings size={16} />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">{profile?.full_name}</h1>
                <VerifiedBadge isVerified={profile?.is_verified} size={20} />
              </div>
              <p className="text-muted-foreground">@{profile?.username}</p>

              {profile?.bio && (
                <p className="text-foreground mt-3">{profile.bio}</p>
              )}

              <div className="flex items-center gap-2 mt-3 text-muted-foreground text-sm">
                {profile?.location && (
                  <>
                    <MapPin size={16} />
                    <span>{profile.location}</span>
                  </>
                )}
              </div>

              {/* Social Links - Always visible, smart click handling */}
              <div className="flex gap-3 mt-4" id="social-links">
                <SocialLinkButton
                  url={profile?.github_url}
                  icon={<Github size={18} />}
                  label="GitHub"
                  isOwnProfile={true}
                  onEditProfile={() => setEditDialogOpen(true)}
                />
                <SocialLinkButton
                  url={profile?.linkedin_url}
                  icon={<Linkedin size={18} />}
                  label="LinkedIn"
                  isOwnProfile={true}
                  onEditProfile={() => setEditDialogOpen(true)}
                />
                <SocialLinkButton
                  url={profile?.instagram_url}
                  icon={<Instagram size={18} />}
                  label="Instagram"
                  isOwnProfile={true}
                  onEditProfile={() => setEditDialogOpen(true)}
                />
                <SocialLinkButton
                  url={profile?.portfolio_url}
                  icon={<Globe size={18} />}
                  label="Website"
                  isOwnProfile={true}
                  onEditProfile={() => setEditDialogOpen(true)}
                />
              </div>

              {/* Stats */}
              <div className="flex gap-6 mt-4 pt-4 border-t border-border" id="followers-following">
                <div>
                  <p className="text-xl font-bold text-foreground">{projects.length}</p>
                  <p className="text-sm text-muted-foreground">Projects</p>
                </div>
                <div
                  className="cursor-pointer hover:text-primary transition-colors"
                  onClick={() => {
                    setFollowersModalTab("followers");
                    setFollowersModalOpen(true);
                  }}
                >
                  <p className="text-xl font-bold text-foreground">{followerCount}</p>
                  <p className="text-sm text-muted-foreground">Followers</p>
                </div>
                <div
                  className="cursor-pointer hover:text-primary transition-colors"
                  onClick={() => {
                    setFollowersModalTab("following");
                    setFollowersModalOpen(true);
                  }}
                >
                  <p className="text-xl font-bold text-foreground">{followingCount}</p>
                  <p className="text-sm text-muted-foreground">Following</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tech Skills */}
          {profile?.tech_skills && profile.tech_skills.length > 0 && (
            <Card className="bg-card border-border">
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

          {/* Wallet Section */}
          <div id="wallet-card-trigger">
            <WalletCard />
          </div>

          {/* Stats Dashboard */}
          <ProfileStatsCard
            postsCount={posts.length}
            likesReceived={posts.reduce((acc, post) => acc + post.likes.length, 0)}
            commentsReceived={posts.reduce((acc, post) => acc + post.comments.length, 0)}
            projectsCount={projects.length}
          />

          {/* Achievement Showcase */}
          <AchievementShowcase userId={user?.id} />

          {/* Gamification & Applications */}
          <div className="grid grid-cols-2 gap-3">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/applications')}
              className="cursor-pointer"
            >
              <Card className="bg-card border-blue-500/30 hover:border-blue-500/50 transition-all shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:shadow-[0_0_25px_rgba(59,130,246,0.3)] h-24 flex flex-col items-center justify-center text-center p-2 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
                <span className="font-bold text-blue-600 block relative z-10">My Applications</span>
                <span className="text-[10px] text-muted-foreground relative z-10">Gigs & Founder Roles</span>
              </Card>
            </motion.div>

            <Card className="bg-card border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.15)] h-24 flex flex-col items-center justify-center text-center p-2 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent pointer-events-none" />
              <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1 relative z-10">
                {profile?.trust_score || 50}
                <Shield className="w-5 h-5 fill-green-500/20" />
              </div>
              <div className="text-[10px] text-muted-foreground relative z-10">Trust Score</div>
            </Card>
          </div>

          {/* Badges Section */}
          {profile?.badges && profile.badges.length > 0 && (
            <Card className="bg-card border-border" id="badges-section">
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  Validation Badges
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

          {/* Projects Tabs */}

          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted">
              <TabsTrigger value="posts" className="data-[state=active]:bg-background">
                Posts
              </TabsTrigger>
              <TabsTrigger value="projects" className="data-[state=active]:bg-background">
                Projects
              </TabsTrigger>
            </TabsList>
            <TabsContent value="posts" className="space-y-4 mt-4">
              {posts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No posts yet</p>
              ) : (
                <ProfilePosts posts={posts} profile={profile} />
              )}
            </TabsContent>
            <TabsContent value="projects" className="space-y-3 mt-4">
              {projects.length === 0 ? (
                <Card className="bg-card border-border">
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No projects yet</p>
                    <Button
                      onClick={() => navigate("/projects")}
                      className="mt-4 gradient-primary text-white"
                    >
                      Create Your First Project
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <ProfileProjects projects={projects} />
              )}
            </TabsContent>
          </Tabs>

          {/* Admin Dashboard Button */}
          {isAdmin && (
            <Button
              onClick={() => navigate("/admin")}
              variant="outline"
              className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <Shield size={18} className="mr-2" />
              Admin Dashboard
            </Button>
          )}

          {/* Feedback Button */}
          <Button
            id="report-problem-btn"
            onClick={() => navigate("/feedback")}
            variant="outline"
            className="w-full border-muted-foreground/30 text-foreground hover:bg-secondary flex items-center justify-center gap-2 h-12 rounded-xl mb-3"
          >
            <MessageSquareWarning size={18} className="text-amber-500" />
            <span className="font-semibold">Report a Problem / Suggest a Feature</span>
          </Button>

          {/* Logout Button */}
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground h-12 rounded-xl"
          >
            <LogOut size={18} className="mr-2" />
            Logout
          </Button>
        </motion.div>
      </div>

      <EditProfileDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        profile={profile}
        userId={user?.id || ""}
        onUpdate={refreshProfile}
      />

      <FollowersModal
        open={followersModalOpen}
        onOpenChange={setFollowersModalOpen}
        userId={user?.id || ""}
        currentUserId={user?.id}
        defaultTab={followersModalTab}
      />

      <LogoutDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        onConfirm={confirmLogout}
      />

      <QRCodeDialog
        open={qrCodeDialogOpen}
        onOpenChange={setQrCodeDialogOpen}
        username={profile?.username || ""}
        userId={user?.id || ""}
      />

      <BottomNav />
    </div>
  );
};

export default React.memo(Profile);
