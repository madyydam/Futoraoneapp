import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Share2 } from "lucide-react";
import { StoryViewer, Story } from "./StoryViewer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import imageCompression from 'browser-image-compression';

// Demo stories for when there are no real users
// Demo stories deleted - using real database stories

const StoryItem = memo(({ user, onClick, isLive }: { user: any, onClick: (id: string) => void, isLive?: boolean }) => (
    <div
        className="flex flex-col items-center gap-1 min-w-[72px] cursor-pointer group"
        onClick={() => onClick(user.id)}
    >
        <div className="relative p-[3px] rounded-full bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] shadow-lg group-hover:scale-110 transition-transform duration-300">
            <div className="rounded-full p-0.5 bg-background">
                <Avatar className="w-16 h-16 border-2 border-background">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>{user.username?.[0]}</AvatarFallback>
                </Avatar>
            </div>
            {isLive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#ff0050] text-white text-[10px] font-black px-1.5 py-0.5 rounded-sm border border-background animate-pulse">
                    LIVE
                </div>
            )}
        </div>
        <span className="text-xs font-medium text-muted-foreground truncate w-full text-center group-hover:text-foreground transition-colors mt-1">
            {user.username}
        </span>
    </div>
));

StoryItem.displayName = "StoryItem";

export const Stories = memo(() => {
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [storiesByUser, setStoriesByUser] = useState<Record<string, Story[]>>({});
    const [usersWithStories, setUsersWithStories] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const { toast } = useToast();

    useEffect(() => {
        fetchStories();
        getCurrentUser();

        // Realtime subscription for new stories
        const channel = supabase
            .channel('public:stories')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => {
                fetchStories();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const getCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            setCurrentUser(profile);
        }
    };

    const fetchStories = async () => {
        try {
            const { data, error } = await supabase
                .from('stories')
                .select(`
                    id,
                    media_url,
                    media_type,
                    created_at,
                    user_id,
                    profiles (
                        id,
                        username,
                        avatar_url
                    )
                `)
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: true });

            if (error) throw error;

            const groupedStories: Record<string, Story[]> = {};
            const usersMap = new Map();

            data?.forEach((item: any) => {
                const userId = item.user_id;
                if (!groupedStories[userId]) {
                    groupedStories[userId] = [];
                    usersMap.set(userId, item.profiles);
                }

                groupedStories[userId].push({
                    id: item.id,
                    url: item.media_url,
                    type: item.media_type,
                    createdAt: item.created_at,
                    user: {
                        id: item.profiles.id,
                        username: item.profiles.username,
                        avatar_url: item.profiles.avatar_url
                    }
                });
            });

            setStoriesByUser(groupedStories);
            setUsersWithStories(Array.from(usersMap.values()));

        } catch (error: any) {
            console.error("Error fetching stories:", error);
        }
    };

    // Use only real stories
    const allStories = storiesByUser;
    const allUsers = usersWithStories;

    const handleUserClick = useCallback((userId: string) => {
        if (allStories[userId]) {
            setSelectedUser(userId);
        }
    }, [allStories]);

    const handleNextUser = useCallback(() => {
        const userIds = Object.keys(allStories);
        const currentIndex = userIds.indexOf(selectedUser!);
        if (currentIndex < userIds.length - 1) {
            setSelectedUser(userIds[currentIndex + 1]);
        } else {
            setSelectedUser(null);
        }
    }, [allStories, selectedUser]);

    const handlePrevUser = useCallback(() => {
        const userIds = Object.keys(allStories);
        const currentIndex = userIds.indexOf(selectedUser!);
        if (currentIndex > 0) {
            setSelectedUser(userIds[currentIndex - 1]);
        } else {
            setSelectedUser(null);
        }
    }, [allStories, selectedUser]);

    // Function to handle file upload for new story
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !currentUser) return;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `stories/${currentUser.id}/${fileName}`;

            let uploadFile = file;

            // Compress if image
            if (file.type.startsWith('image')) {
                const options = {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1920,
                    useWebWorker: true,
                };
                try {
                    uploadFile = await imageCompression(file, options);
                } catch (error) {
                    console.error("Story image compression failed:", error);
                }
            }

            const { error: uploadError } = await supabase.storage
                .from('stories') // Make sure this bucket exists!
                .upload(filePath, uploadFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('stories')
                .getPublicUrl(filePath);

            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);

            const { error: dbError } = await supabase.from('stories').insert({
                user_id: currentUser.id,
                media_url: publicUrl,
                media_type: file.type.startsWith('video') ? 'video' : 'image',
                expires_at: expiresAt.toISOString()
            });

            if (dbError) throw dbError;

            toast({
                title: "Story added!",
                description: "Your story has been posted successfully.",
            });

            fetchStories();

        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const handleInvite = useCallback(async () => {
        const shareData = {
            title: 'Join FutoraOne!',
            text: 'Connect with developers, share projects, and earn rewards on FutoraOne.',
            url: 'https://futora1.vercel.app',
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (error) {
                console.log('Error sharing:', error);
            }
        } else {
            try {
                await navigator.clipboard.writeText(shareData.url);
                toast({
                    title: "Link copied!",
                    description: "Invitation link copied to clipboard.",
                });
            } catch (err) {
                console.error('Failed to copy: ', err);
            }
        }
    }, [toast]);

    return (
        <>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {/* My Story */}
                <div
                    className="flex flex-col items-center gap-1 min-w-[72px] cursor-pointer relative group"
                    onClick={() => currentUser && allStories[currentUser.id] && handleUserClick(currentUser.id)}
                >
                    <div className="relative">
                        {/* Show gradient ring if user has stories */}
                        {currentUser && allStories[currentUser.id] && (
                            <div className="absolute inset-0 p-[2px] rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 ring-2 ring-black/30 dark:ring-transparent" />
                        )}
                        <Avatar className={`w-16 h-16 border-2 border-background ${currentUser && allStories[currentUser.id] ? 'relative z-10' : 'p-0.5'}`}>
                            <AvatarImage src={currentUser?.avatar_url} />
                            <AvatarFallback>ME</AvatarFallback>
                        </Avatar>
                        {/* Only show plus button if user has NO stories */}
                        {(!currentUser || !allStories[currentUser.id]) && (
                            <label htmlFor="story-upload" className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-0.5 border-2 border-background cursor-pointer hover:bg-primary/90 transition-colors z-20">
                                <Plus className="w-4 h-4" />
                                <input
                                    type="file"
                                    id="story-upload"
                                    className="hidden"
                                    accept="image/*,video/*"
                                    onChange={handleFileUpload}
                                />
                            </label>
                        )}
                    </div>
                    <span className="text-xs text-muted-foreground truncate w-full text-center group-hover:text-foreground transition-colors">
                        {currentUser && allStories[currentUser.id] ? 'Your Story' : 'Add Story'}
                    </span>
                </div>

                {/* Invite Placeholder */}
                <div
                    className="flex flex-col items-center gap-1 min-w-[72px] cursor-pointer group"
                    onClick={handleInvite}
                >
                    <div className="relative p-[3px] rounded-full border-2 border-dashed border-primary/30 group-hover:border-primary/60 transition-colors">
                        <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center">
                            <Share2 className="w-6 h-6 text-primary/60 group-hover:text-primary transition-colors" />
                        </div>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors mt-1">Invite</span>
                </div>

                {/* Other Users (excluding current user) */}
                {allUsers.filter(user => user.id !== currentUser?.id).map((user) => (
                    <StoryItem
                        key={user.id}
                        user={user}
                        onClick={handleUserClick}
                        isLive={false} // Transitioned from demo live status
                    />
                ))}

                {/* Empty State Fillers (if few stories) */}
                {allUsers.length < 3 && (
                    <>
                        <div className="flex flex-col items-center gap-1 min-w-[72px] opacity-50 grayscale pointer-events-none">
                            <div className="relative p-[3px] rounded-full border-2 border-dotted border-muted">
                                <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center">
                                    <span className="text-lg font-bold text-muted-foreground/50">?</span>
                                </div>
                            </div>
                            <span className="text-xs font-medium text-muted-foreground mt-1">Soon</span>
                        </div>
                    </>
                )}
            </div>

            {selectedUser && allStories[selectedUser] && (
                <StoryViewer
                    stories={allStories[selectedUser]}
                    onClose={() => setSelectedUser(null)}
                    onNextUser={handleNextUser}
                    onPrevUser={handlePrevUser}
                />
            )}
        </>
    );
});

Stories.displayName = "Stories";
