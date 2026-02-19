import { memo, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Users, Shield, Github, Linkedin, Instagram, Globe, MoreVertical, Star } from "lucide-react";
import { FollowButton } from "@/components/FollowButton";
import { StartChatButton } from "@/components/StartChatButton";

import { VerifiedBadge } from "@/components/VerifiedBadge";
import { CreateReviewDialog } from "@/components/CreateReviewDialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

// Social Link Button Component
interface SocialLinkButtonProps {
    url: string | null | undefined;
    icon: React.ReactNode;
    label: string;
    isOwnProfile: boolean;
    onEditProfile: () => void;
}

const SocialLinkButton = memo<SocialLinkButtonProps>(({
    url,
    icon,
    label,
    isOwnProfile,
    onEditProfile,
}) => {
    const { toast } = useToast();

    const handleClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();

        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
        } else {
            if (isOwnProfile) {
                onEditProfile();
                toast({
                    title: "Complete Your Profile",
                    description: `Add your ${label} URL in the edit profile section.`,
                });
            } else {
                toast({
                    title: "Not Connected",
                    description: `This user hasn't connected their ${label} account yet.`,
                    variant: "destructive",
                });
            }
        }
    }, [url, isOwnProfile, onEditProfile, label, toast]);

    return (
        <Button
            variant="ghost"
            size="sm"
            className={`text-foreground ${!url ? 'opacity-50' : ''}`}
            onClick={handleClick}
        >
            {icon}
        </Button>
    );
});

SocialLinkButton.displayName = "SocialLinkButton";

interface ProfileHeaderProps {
    profile: any;
    currentUser: any;
    userId: string;
    mutualCount: number;
    isAdmin: boolean;
    isBlocked: boolean;
    onFollowChange: () => void;
    onMutualClick: () => void;
    onVerifyUser: () => void;
    onRemoveVerification: () => void;
    onBlockUser: () => void;
    onUnblockUser: () => void;
}

export const ProfileHeader = memo(({
    profile,
    currentUser,
    userId,
    mutualCount,
    isAdmin,
    isBlocked,
    onFollowChange,
    onMutualClick,
    onVerifyUser,
    onRemoveVerification,
    onBlockUser,
    onUnblockUser
}: ProfileHeaderProps) => {
    const navigate = useNavigate();

    return (
        <Card className="bg-card/80 backdrop-blur-sm border-border">
            <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="relative">
                        <div className={`rounded-full ${profile?.verification_category === 'creator'
                            ? "p-[3px] bg-gradient-to-tr from-[#FFD700] via-[#FDB931] to-[#C0B283] shadow-[0_0_15px_rgba(255,215,0,0.5)]"
                            : ""
                            }`}>
                            <Avatar className={`h-24 w-24 border-4 ${profile?.verification_category === 'creator' ? "border-white" : "border-background"
                                }`}>
                                <AvatarImage src={profile?.avatar_url || undefined} loading="lazy" />
                                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                                    {profile?.full_name?.[0] || currentUser?.email?.[0]?.toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </div>

                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                        <FollowButton
                            userId={userId}
                            currentUserId={currentUser?.id}
                            onFollowChange={onFollowChange}
                        />
                        <StartChatButton
                            userId={userId}
                            currentUserId={currentUser?.id}
                        />
                        {currentUser && currentUser.id !== userId && (
                            <CreateReviewDialog
                                revieweeId={userId}
                                revieweeName={profile?.full_name || ""}
                                trigger={
                                    <Button variant="ghost" size="icon" title="Leave a Review">
                                        <Star className="w-5 h-5" />
                                    </Button>
                                }
                            />
                        )}
                        {currentUser && currentUser.id !== userId && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <MoreVertical className="h-5 w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {isAdmin ? (
                                        <>
                                            {profile?.is_verified ? (
                                                <DropdownMenuItem
                                                    className="text-orange-600 focus:text-orange-600 cursor-pointer"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onRemoveVerification();
                                                    }}
                                                >
                                                    Remove Verification
                                                </DropdownMenuItem>
                                            ) : (
                                                <DropdownMenuItem
                                                    className="text-green-600 focus:text-green-600 cursor-pointer"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onVerifyUser();
                                                    }}
                                                >
                                                    Verify this User
                                                </DropdownMenuItem>
                                            )}
                                        </>
                                    ) : (
                                        <DropdownMenuItem
                                            className="text-destructive focus:text-destructive cursor-pointer"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (isBlocked) {
                                                    onUnblockUser();
                                                } else {
                                                    onBlockUser();
                                                }
                                            }}
                                        >
                                            {isBlocked ? "Unblock User" : "Block User"}
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    {profile?.full_name}
                    <VerifiedBadge isVerified={profile?.is_verified} size={20} />
                </h1>
                <div className="flex items-center gap-2">
                    <p className="text-muted-foreground">@{profile?.username}</p>
                    {mutualCount > 0 && currentUser?.id !== userId && (
                        <Badge
                            variant="secondary"
                            className="flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer transition-colors"
                            onClick={onMutualClick}
                        >
                            <Users size={12} />
                            {mutualCount} mutual
                        </Badge>
                    )}
                    <Badge variant="outline" className="ml-2 border-green-200 bg-green-50 text-green-700 flex items-center gap-1">
                        <Shield size={12} className="fill-green-100" />
                        {profile?.trust_score || 50} Trust
                    </Badge>
                </div>

                {profile?.bio && (
                    <p className="text-foreground mt-3">{profile.bio}</p>
                )}

                <div className="flex items-center gap-2 mt-3 text-muted-foreground text-sm">
                    <>
                        <MapPin size={16} />
                        <span>{profile?.location || "Pune"}</span>
                    </>
                </div>

                {/* Social Links */}
                <div className="flex gap-3 mt-4">
                    <SocialLinkButton
                        url={profile?.github_url}
                        icon={<Github size={18} />}
                        label="GitHub"
                        isOwnProfile={currentUser?.id === userId}
                        onEditProfile={() => navigate('/profile')}
                    />
                    <SocialLinkButton
                        url={profile?.linkedin_url}
                        icon={<Linkedin size={18} />}
                        label="LinkedIn"
                        isOwnProfile={currentUser?.id === userId}
                        onEditProfile={() => navigate('/profile')}
                    />
                    <SocialLinkButton
                        url={profile?.instagram_url}
                        icon={<Instagram size={18} />}
                        label="Instagram"
                        isOwnProfile={currentUser?.id === userId}
                        onEditProfile={() => navigate('/profile')}
                    />
                    <SocialLinkButton
                        url={profile?.portfolio_url}
                        icon={<Globe size={18} />}
                        label="Website"
                        isOwnProfile={currentUser?.id === userId}
                        onEditProfile={() => navigate('/profile')}
                    />
                </div>
            </CardContent>
        </Card>
    );
});

ProfileHeader.displayName = "ProfileHeader";
