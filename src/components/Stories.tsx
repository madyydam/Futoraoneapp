import { useState, useEffect, useCallback, memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Share2 } from "lucide-react";
import { StoryViewer, Story } from "./StoryViewer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import imageCompression from "browser-image-compression";
import { StoryUploadProgress } from "@/components/stories/StoryUploadProgress";
import { StoryComposerModal } from "@/components/stories/StoryComposerModal";

interface StoryUser {
  id: string;
  username: string;
  avatar_url: string | null;
}

const StoryItem = memo(
  ({
    user,
    onClick,
    hasUnseen,
  }: {
    user: StoryUser;
    onClick: (id: string) => void;
    hasUnseen: boolean;
  }) => (
    <div
      className="flex flex-col items-center gap-1 min-w-[72px] cursor-pointer group select-none"
      onClick={() => onClick(user.id)}
    >
      <div
        className={`relative p-[2.5px] rounded-full transition-transform duration-200 group-hover:scale-105 ${
          hasUnseen
            ? "bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] shadow-md"
            : "border-2 border-slate-300 dark:border-neutral-700"
        }`}
      >
        <div className="rounded-full p-0.5 bg-background">
          <Avatar className="w-16 h-16 border-2 border-background">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-tr from-pink-500/20 to-purple-500/20 font-bold text-sm">
              {user.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
      <span className="text-xs font-medium text-muted-foreground truncate w-full text-center group-hover:text-foreground transition-colors mt-0.5 max-w-[76px]">
        {user.username}
      </span>
    </div>
  )
);

StoryItem.displayName = "StoryItem";

export const Stories = memo(() => {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [storiesByUser, setStoriesByUser] = useState<Record<string, Story[]>>({});
  const [usersWithStories, setUsersWithStories] = useState<StoryUser[]>([]);
  const [viewedStoryIds, setViewedStoryIds] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Story Composer File state
  const [composerFile, setComposerFile] = useState<File | null>(null);

  // Upload states
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState("Preparing story...");

  const { toast } = useToast();

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!currentUser) {
      toast({
        title: "Please Sign In",
        description: "You must be signed in to post a story.",
        variant: "destructive",
      });
      return;
    }
    setComposerFile(file);
    event.target.value = "";
  };

  const fetchStories = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch profiles current user follows
      const { data: followRows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      const followingIds = (followRows || []).map((f) => f.following_id);
      // STRICT FOLLOWING FILTER: Only current user + followed users
      const allowedUserIds = [user.id, ...followingIds];

      // 2. Query active stories strictly within allowed IDs
      const { data, error } = await supabase
        .from("stories")
        .select(`
          id,
          media_url,
          media_type,
          caption,
          created_at,
          user_id,
          profiles (
            id,
            username,
            avatar_url
          )
        `)
        .in("user_id", allowedUserIds)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      // 3. Fetch viewed stories for current user to track Seen vs Unseen status
      const { data: viewsData } = await supabase
        .from("story_views")
        .select("story_id")
        .eq("viewer_id", user.id);

      const viewedSet = new Set((viewsData || []).map((v) => v.story_id));
      setViewedStoryIds(viewedSet);

      const groupedStories: Record<string, Story[]> = {};
      const usersMap = new Map<string, StoryUser>();

      data?.forEach((item: any) => {
        const uId = item.user_id;
        if (!groupedStories[uId]) {
          groupedStories[uId] = [];
          if (item.profiles) {
            usersMap.set(uId, {
              id: item.profiles.id,
              username: item.profiles.username,
              avatar_url: item.profiles.avatar_url,
            });
          }
        }

        groupedStories[uId].push({
          id: item.id,
          url: item.media_url,
          type: item.media_type,
          caption: item.caption,
          createdAt: item.created_at,
          user: {
            id: item.profiles?.id || uId,
            username: item.profiles?.username || "user",
            avatar_url: item.profiles?.avatar_url || null,
          },
        });
      });

      setStoriesByUser(groupedStories);
      setUsersWithStories(Array.from(usersMap.values()));
    } catch (error: any) {
      console.error("Error fetching stories:", error);
    }
  }, []);

  const getCurrentUser = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, is_verified")
        .eq("id", user.id)
        .maybeSingle();
      setCurrentUser(profile);
    }
  }, []);

  useEffect(() => {
    fetchStories();
    getCurrentUser();

    // Realtime subscription for stories
    const channel = supabase
      .channel("public:stories")
      .on("postgres_changes", { event: "*", schema: "public", table: "stories" }, () => {
        fetchStories();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "story_views" }, () => {
        fetchStories();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStories, getCurrentUser]);

  const allStories = storiesByUser;
  const allUsers = usersWithStories;
  const myStories = currentUser ? allStories[currentUser.id] || [] : [];
  const hasMyStories = myStories.length > 0;

  const handleUserClick = useCallback(
    (userId: string) => {
      if (allStories[userId]?.length) {
        setSelectedUser(userId);
      }
    },
    [allStories]
  );

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

  // Handle direct file upload from the story tray with circular progress
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;

    setUploading(true);
    setUploadProgress(10);
    setUploadStage("Preparing media...");
    let uploadedPath: string | null = null;

    try {
      let uploadFile: File = file;

      if (file.type.startsWith("image")) {
        setUploadStage("Optimizing image...");
        setUploadProgress(25);
        try {
          uploadFile = await imageCompression(file, {
            maxSizeMB: 1.5,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            onProgress: (p) => setUploadProgress(20 + Math.round(p * 0.2)),
          });
        } catch (compressionErr) {
          console.warn("Compression skipped:", compressionErr);
        }
      }

      setUploadStage("Uploading to cloud...");
      setUploadProgress(50);

      const fileExt = uploadFile.name.split(".").pop() || "jpg";
      const fileName = `${currentUser.id}/${crypto.randomUUID()}.${fileExt}`;

      const progressTimer = setInterval(() => {
        setUploadProgress((prev) => (prev < 85 ? prev + 5 : prev));
      }, 150);

      const { error: uploadError } = await supabase.storage
        .from("stories")
        .upload(fileName, uploadFile, { upsert: false });

      clearInterval(progressTimer);
      if (uploadError) throw uploadError;
      uploadedPath = fileName;

      setUploadProgress(90);
      setUploadStage("Publishing story...");

      const {
        data: { publicUrl },
      } = supabase.storage.from("stories").getPublicUrl(fileName);

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Strict 24 hours

      const { error: dbError } = await supabase.from("stories").insert({
        user_id: currentUser.id,
        media_url: publicUrl,
        media_type: file.type.startsWith("video") ? "video" : "image",
        expires_at: expiresAt.toISOString(),
      });

      if (dbError) throw dbError;

      setUploadProgress(100);
      setUploadStage("Story published!");
      await new Promise((r) => setTimeout(r, 400));

      toast({
        title: "Story Published! ✨",
        description: "Your story is now live for 24 hours for your followers.",
      });

      fetchStories();
    } catch (error: any) {
      if (uploadedPath) {
        await supabase.storage.from("stories").remove([uploadedPath]).catch(() => {});
      }
      toast({
        title: "Upload Failed",
        description: error.message || "Could not publish story.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset input value so re-selecting same file triggers onChange
      event.target.value = "";
    }
  };

  const handleInvite = useCallback(async () => {
    const shareData = {
      title: "Join One!",
      text: "Connect with developers, share projects, and watch stories on One.",
      url: window.location.origin,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {}
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareData.url);
      toast({
        title: "Link copied!",
        description: "Invitation link copied to clipboard.",
      });
    }
  }, [toast]);

  return (
    <>
      {/* Uploading Circular Modal with Real-time Percentage */}
      {uploading && (
        <StoryUploadProgress progress={uploadProgress} stage={uploadStage} />
      )}

      <div
        id="stories-row"
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide select-none pt-1"
      >
        {/* Current User Story Item */}
        <div className="flex flex-col items-center gap-1 min-w-[72px] relative group">
          <div className="relative">
            {/* Instagram Gradient Ring if user has active stories */}
            {hasMyStories ? (
              <div
                onClick={() => handleUserClick(currentUser.id)}
                className="cursor-pointer p-[2.5px] rounded-full bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] shadow-md transition-transform duration-200 group-hover:scale-105"
              >
                <div className="rounded-full p-0.5 bg-background">
                  <Avatar className="w-16 h-16 border-2 border-background">
                    <AvatarImage src={currentUser?.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-tr from-pink-500/20 to-purple-500/20 font-bold text-sm">
                      ME
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
            ) : (
              <label
                htmlFor="direct-story-upload"
                className="cursor-pointer block p-0.5 rounded-full border-2 border-dashed border-primary/40 hover:border-primary transition-colors"
              >
                <Avatar className="w-16 h-16 border-2 border-background">
                  <AvatarImage src={currentUser?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                    ME
                  </AvatarFallback>
                </Avatar>
              </label>
            )}

            {/* Quick Add (+) Badge: Always visible to allow adding another story */}
            <label
              htmlFor="direct-story-upload"
              className="absolute bottom-0 right-0 bg-primary hover:bg-primary/90 text-white rounded-full p-1 border-2 border-background cursor-pointer shadow-md transition-transform active:scale-90 z-20"
              title="Add a new story"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <input
                type="file"
                id="direct-story-upload"
                className="hidden"
                accept="image/*,video/*"
                onChange={handleFileSelected}
              />
            </label>
          </div>

          <span
            onClick={() => hasMyStories && handleUserClick(currentUser.id)}
            className={`text-xs font-medium truncate w-full text-center transition-colors mt-0.5 ${
              hasMyStories
                ? "cursor-pointer group-hover:text-foreground text-foreground font-semibold"
                : "text-muted-foreground"
            }`}
          >
            Your Story
          </span>
        </div>

        {/* Following Users Stories (Filtered by follows) */}
        {allUsers
          .filter((user) => user.id !== currentUser?.id)
          .map((user) => {
            const userStories = allStories[user.id] || [];
            const hasUnseen = userStories.some((s) => !viewedStoryIds.has(s.id));

            return (
              <StoryItem
                key={user.id}
                user={user}
                hasUnseen={hasUnseen}
                onClick={handleUserClick}
              />
            );
          })}

        {/* Invite / Share Pill */}
        <div
          className="flex flex-col items-center gap-1 min-w-[72px] cursor-pointer group"
          onClick={handleInvite}
        >
          <div className="relative p-[3px] rounded-full border-2 border-dashed border-primary/30 group-hover:border-primary/70 transition-colors">
            <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center">
              <Share2 className="w-6 h-6 text-primary/60 group-hover:text-primary transition-colors" />
            </div>
          </div>
          <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors mt-0.5">
            Invite
          </span>
        </div>
      </div>

      {/* Fullscreen Instagram Story Viewer Modal */}
      {selectedUser && allStories[selectedUser]?.length > 0 && (
        <StoryViewer
          stories={allStories[selectedUser]}
          onClose={() => setSelectedUser(null)}
          onNextUser={handleNextUser}
          onPrevUser={handlePrevUser}
          onStoryDeleted={() => fetchStories()}
        />
      )}

      {/* Fullscreen Instagram Story Composer Modal */}
      {composerFile && currentUser && (
        <StoryComposerModal
          file={composerFile}
          currentUser={currentUser}
          onClose={() => setComposerFile(null)}
          onStoryPublished={() => {
            setComposerFile(null);
            fetchStories();
          }}
        />
      )}
    </>
  );
});

Stories.displayName = "Stories";
