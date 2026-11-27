import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  Send,
  Trash2,
  Archive,
  Eye,
  MoreVertical,
  Download,
  Share2,
  Loader2,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

export interface Story {
  id: string;
  url: string;
  type: "image" | "video";
  caption?: string | null;
  duration?: number;
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  createdAt: string;
}

interface StoryViewerProps {
  stories: Story[];
  initialStoryIndex?: number;
  onClose: () => void;
  onNextUser?: () => void;
  onPrevUser?: () => void;
  onStoryDeleted?: (storyId: string) => void;
}

interface StoryViewerUser {
  id: string;
  username: string;
  avatar_url: string | null;
  full_name: string | null;
  viewed_at: string;
}

const QUICK_REACTIONS = ["🔥", "❤️", "😂", "👏", "😮", "😍"];

export const StoryViewer = ({
  stories: initialStories,
  initialStoryIndex = 0,
  onClose,
  onNextUser,
  onPrevUser,
  onStoryDeleted,
}: StoryViewerProps) => {
  const navigate = useNavigate();
  const [stories, setStories] = useState<Story[]>(initialStories);
  const [currentIndex, setCurrentIndex] = useState(initialStoryIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Floating reactions state
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string; x: number }[]>([]);

  // Owner Viewers Modal & Action Dialogs
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewers, setViewers] = useState<StoryViewerUser[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const currentStory = stories[currentIndex];
  const storyAuthorId = currentStory?.user?.id || (currentStory as any)?.user_id || (currentStory as any)?.userId;
  const isOwner = Boolean(currentUserId && storyAuthorId && storyAuthorId === currentUserId);
  const DURATION = currentStory?.duration ? currentStory.duration * 1000 : 5000;
  const UPDATE_INTERVAL = 50;

  // Sync internal stories if prop updates
  useEffect(() => {
    setStories(initialStories);
  }, [initialStories]);

  // Fetch current user immediately from session cache and verify
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) setCurrentUserId(session.user.id);
    });
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.id) setCurrentUserId(user.id);
    });
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      if (onNextUser) {
        onNextUser();
      } else {
        onClose();
      }
    }
  }, [currentIndex, stories.length, onNextUser, onClose]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    } else {
      if (onPrevUser) {
        onPrevUser();
      } else {
        onClose();
      }
    }
  }, [currentIndex, onPrevUser, onClose]);

  // Timer loop for progress bar
  useEffect(() => {
    if (isPaused || viewersOpen || deleteDialogOpen || !currentStory) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + 100 / (DURATION / UPDATE_INTERVAL);
      });
    }, UPDATE_INTERVAL);

    return () => clearInterval(interval);
  }, [currentIndex, isPaused, viewersOpen, deleteDialogOpen, DURATION, handleNext, currentStory]);

  // Reset progress and handle video on story switch
  useEffect(() => {
    setProgress(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [currentIndex]);

  // Track view in DB when viewer looks at a story
  useEffect(() => {
    if (!currentStory || !currentUserId || isOwner) return;

    const recordView = async () => {
      try {
        await supabase.from("story_views").insert({
          story_id: currentStory.id,
          viewer_id: currentUserId,
        });
      } catch {
        // Unique constraint violation is expected if already viewed
      }
    };
    recordView();
  }, [currentStory, currentUserId, isOwner]);

  // Fetch viewers count for owner
  useEffect(() => {
    if (!currentStory || !isOwner) return;

    const fetchViewerCount = async () => {
      const { count } = await supabase
        .from("story_views")
        .select("*", { count: "exact", head: true })
        .eq("story_id", currentStory.id);
      setViewerCount(count || 0);
    };

    fetchViewerCount();
  }, [currentStory, isOwner]);

  // Fetch viewers list when modal opens
  const handleOpenViewers = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentStory) return;
    setIsPaused(true);
    setViewersOpen(true);
    setLoadingViewers(true);

    try {
      const { data, error } = await supabase
        .from("story_views")
        .select(`
          id,
          viewed_at,
          viewer_id,
          profiles:viewer_id (
            id,
            username,
            avatar_url,
            full_name
          )
        `)
        .eq("story_id", currentStory.id)
        .order("viewed_at", { ascending: false });

      if (!error && data) {
        const formatted: StoryViewerUser[] = data.map((v: any) => {
          const prof = Array.isArray(v.profiles) ? v.profiles[0] : v.profiles;
          return {
            id: prof?.id || v.viewer_id || "",
            username: prof?.username || "user",
            avatar_url: prof?.avatar_url || null,
            full_name: prof?.full_name || null,
            viewed_at: v.viewed_at || new Date().toISOString(),
          };
        });
        setViewers(formatted);
        setViewerCount(formatted.length);
      } else {
        // Fallback: query story_views and join profiles manually if needed
        const { data: rawViews } = await supabase
          .from("story_views")
          .select("viewer_id, viewed_at")
          .eq("story_id", currentStory.id)
          .order("viewed_at", { ascending: false });

        if (rawViews && rawViews.length > 0) {
          const viewerIds = rawViews.map((r: any) => r.viewer_id);
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, username, avatar_url, full_name")
            .in("id", viewerIds);

          const profMap = new Map((profs || []).map((p: any) => [p.id, p]));
          const formatted: StoryViewerUser[] = rawViews.map((r: any) => {
            const p = profMap.get(r.viewer_id);
            return {
              id: r.viewer_id,
              username: p?.username || "user",
              avatar_url: p?.avatar_url || null,
              full_name: p?.full_name || null,
              viewed_at: r.viewed_at || new Date().toISOString(),
            };
          });
          setViewers(formatted);
          setViewerCount(formatted.length);
        } else {
          setViewers([]);
          setViewerCount(0);
        }
      }
    } catch (err) {
      console.error("Error fetching story viewers:", err);
    } finally {
      setLoadingViewers(false);
    }
  };

  // Delete story
  const handleDeleteStory = async () => {
    if (!currentStory) return;
    setDeleting(true);

    try {
      const storyId = currentStory.id;
      const { error } = await supabase.from("stories").delete().eq("id", storyId);
      if (error) throw error;

      toast({
        title: "Story deleted",
        description: "Your story has been permanently removed.",
      });

      onStoryDeleted?.(storyId);

      const remaining = stories.filter((s) => s.id !== storyId);
      if (remaining.length === 0) {
        onClose();
      } else {
        setStories(remaining);
        setCurrentIndex((prev) => (prev >= remaining.length ? remaining.length - 1 : prev));
        setProgress(0);
      }
    } catch (err: any) {
      toast({
        title: "Failed to delete story",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setIsPaused(false);
    }
  };

  // Archive story (sets expires_at = NOW() so it moves to private archive)
  const handleArchiveStory = async () => {
    if (!currentStory) return;

    try {
      const storyId = currentStory.id;
      const { error } = await supabase
        .from("stories")
        .update({ expires_at: new Date().toISOString() })
        .eq("id", storyId);

      if (error) throw error;

      toast({
        title: "Story Archived 📦",
        description: "Moved to your private Story Archive.",
      });

      onStoryDeleted?.(storyId);

      const remaining = stories.filter((s) => s.id !== storyId);
      if (remaining.length === 0) {
        onClose();
      } else {
        setStories(remaining);
        setCurrentIndex((prev) => (prev >= remaining.length ? remaining.length - 1 : prev));
        setProgress(0);
      }
    } catch (err: any) {
      toast({
        title: "Archive Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // Download story media
  const handleDownload = async () => {
    if (!currentStory) return;
    try {
      const response = await fetch(currentStory.url);
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `story_${currentStory.user.username}_${Date.now()}.${currentStory.type === "video" ? "mp4" : "jpg"}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Media downloaded" });
    } catch {
      toast({ title: "Could not download media", variant: "destructive" });
    }
  };

  // Copy story link
  const handleShare = async () => {
    if (!currentStory) return;
    const shareUrl = `${window.location.origin}/story/${currentStory.user.id}`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link copied to clipboard!" });
    }
  };

  // Send Direct Message reply to story author
  const handleSendReply = async (messageText?: string) => {
    const text = (messageText || inputValue).trim();
    if (!text || !currentUserId || !currentStory) return;

    setSendingMessage(true);
    try {
      // 1. Get or create conversation with the story author
      const { data: convId, error: convError } = await (supabase.rpc as any)(
        "get_or_create_conversation",
        { other_user_id: currentStory.user.id }
      );
      if (convError || !convId) throw convError || new Error("Conversation unavailable");

      // 2. Insert message into messages table
      const formattedMessage = `Replied to your story: "${text}"`;
      const { error: msgError } = await supabase.from("messages").insert({
        conversation_id: convId,
        sender_id: currentUserId,
        content: formattedMessage,
      });
      if (msgError) throw msgError;

      setInputValue("");
      toast({
        title: "Reply sent! 💬",
        description: `Sent to @${currentStory.user.username}`,
      });
    } catch (err: any) {
      toast({
        title: "Could not send reply",
        description: err.message || "Failed to send message.",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  // Trigger floating reaction animation and notify author
  const handleQuickReaction = (emoji: string) => {
    const newEmoji = {
      id: Date.now() + Math.random(),
      emoji,
      x: 35 + Math.random() * 30, // Random horizontal spread
    };
    setFloatingEmojis((prev) => [...prev, newEmoji]);

    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((e) => e.id !== newEmoji.id));
    }, 1800);

    // Send emoji as DM reaction
    handleSendReply(emoji);
  };

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, input, [role='dialog'], [role='menu']")) return;
    const width = e.currentTarget.offsetWidth;
    const x = e.nativeEvent.offsetX;

    if (x < width * 0.3) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  if (!currentStory) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="fixed inset-0 z-[999999] bg-black flex items-center justify-center select-none"
      >
        {/* Floating Emojis Animation Layer */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
          {floatingEmojis.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 1, y: "80vh", scale: 0.8, x: `${item.x}vw` }}
              animate={{ opacity: 0, y: "15vh", scale: 2 }}
              transition={{ duration: 1.8, ease: "easeOut" }}
              className="absolute text-5xl"
            >
              {item.emoji}
            </motion.div>
          ))}
        </div>

        {/* Main Phone-frame Container */}
        <div
          className="relative w-full max-w-md h-full md:h-[92vh] md:rounded-3xl overflow-hidden bg-black flex flex-col justify-between shadow-2xl"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
          onClick={handleTap}
        >
          {/* Top Bar: Progress Segments */}
          <div className="absolute top-0 left-0 right-0 z-30 p-2.5 pt-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
            {/* Segmented Progress Indicators */}
            <div className="flex gap-1.5 w-full">
              {stories.map((story, index) => (
                <div
                  key={story.id}
                  className="h-1 flex-1 bg-white/25 rounded-full overflow-hidden"
                >
                  <div
                    className="h-full bg-white transition-all duration-75 ease-linear rounded-full"
                    style={{
                      width:
                        index < currentIndex
                          ? "100%"
                          : index === currentIndex
                          ? `${progress}%`
                          : "0%",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* User Details & Controls Header */}
            <div className="flex items-center justify-between mt-3 px-1">
              <div className="flex items-center gap-2.5">
                <Avatar className="w-9 h-9 border-2 border-white/80 ring-1 ring-black/40 shadow-sm">
                  <AvatarImage src={currentStory.user.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-tr from-[#f09433] to-[#bc1888] text-white font-bold text-xs">
                    {currentStory.user.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-sm tracking-tight drop-shadow-md">
                      {currentStory.user.username}
                    </span>
                    <span className="text-white/60 text-xs font-medium">
                      {formatDistanceToNow(new Date(currentStory.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Viewers Badge, 3-Dots Menu & Close */}
              <div className="flex items-center gap-1.5">
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenViewers(e);
                    }}
                    className="text-white hover:text-white hover:bg-white/20 rounded-full h-8 px-2.5 flex items-center gap-1.5 text-xs font-semibold border border-white/20 bg-white/10 backdrop-blur-md transition-transform active:scale-95"
                  >
                    <Eye className="w-3.5 h-3.5 text-pink-400" />
                    <span>{viewerCount}</span>
                  </Button>
                )}

                <DropdownMenu onOpenChange={(open) => setIsPaused(open)}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white/90 hover:text-white hover:bg-white/20 rounded-full w-8 h-8"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-52 bg-neutral-900/95 border-white/10 text-white backdrop-blur-xl rounded-2xl shadow-2xl p-1.5 z-50"
                  >
                    {isOwner ? (
                      <>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenViewers(e);
                          }}
                          className="hover:bg-white/10 cursor-pointer font-medium rounded-xl flex items-center gap-2 text-pink-300"
                        >
                          <Eye className="w-4 h-4 text-pink-400" />
                          View Story Viewers ({viewerCount})
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteDialogOpen(true)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer font-semibold rounded-xl flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                          Delete Story
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={handleArchiveStory}
                          className="hover:bg-white/10 cursor-pointer font-medium rounded-xl flex items-center gap-2"
                        >
                          <Archive className="w-4 h-4 text-pink-400" />
                          Archive Story
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/10 my-1" />
                      </>
                    ) : null}

                    <DropdownMenuItem
                      onClick={handleDownload}
                      className="hover:bg-white/10 cursor-pointer font-medium rounded-xl flex items-center gap-2"
                    >
                      <Download className="w-4 h-4 text-cyan-400" />
                      Download Media
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleShare}
                      className="hover:bg-white/10 cursor-pointer font-medium rounded-xl flex items-center gap-2"
                    >
                      <Share2 className="w-4 h-4 text-purple-400" />
                      Copy Story Link
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/90 hover:text-white hover:bg-white/20 rounded-full w-8 h-8"
                  onClick={onClose}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Media Content Area with Atmospheric Background */}
          <div className="w-full h-full flex items-center justify-center bg-black relative overflow-hidden">
            {/* Atmospheric Blurred Background (Prevents empty or cropped space for landscape/portrait) */}
            {currentStory.type === "image" ? (
              <>
                <img
                  src={currentStory.url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-40 scale-125 select-none pointer-events-none"
                />
                <img
                  src={currentStory.url}
                  alt="Story"
                  className="relative z-10 max-w-full max-h-full object-contain select-none pointer-events-none drop-shadow-2xl"
                />
              </>
            ) : (
              <>
                <video
                  src={currentStory.url}
                  muted
                  className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-40 scale-125 select-none pointer-events-none"
                />
                <video
                  ref={videoRef}
                  src={currentStory.url}
                  autoPlay
                  playsInline
                  muted={false}
                  className="relative z-10 max-w-full max-h-full object-contain select-none pointer-events-none drop-shadow-2xl"
                />
              </>
            )}

            {/* Optional Story Caption Overlay */}
            {currentStory.caption && (
              <div className="absolute bottom-28 left-4 right-4 z-20">
                <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-3 text-white text-sm font-medium text-center shadow-lg">
                  {currentStory.caption}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Bar: Owner Viewers Pill OR Viewer Engagement */}
          <div className="absolute bottom-0 left-0 right-0 z-30 p-4 pb-8 sm:pb-6 bg-gradient-to-t from-black/95 via-black/70 to-transparent">
            {isOwner ? (
              /* Story Owner Toolbar */
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenViewers(e);
                  }}
                  className="rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-semibold px-4 py-2 flex items-center gap-2 border border-white/20 backdrop-blur-md shadow-lg transition-transform active:scale-95"
                >
                  <Eye className="w-4 h-4 text-pink-400" />
                  <span>{viewerCount} {viewerCount === 1 ? "view" : "views"}</span>
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteDialogOpen(true)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/15 rounded-full text-xs font-bold px-3 py-1.5 flex items-center gap-1.5 border border-red-500/20 backdrop-blur-md shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleArchiveStory}
                    className="text-white/90 hover:text-white hover:bg-white/20 rounded-full text-xs font-semibold px-3 py-1.5 flex items-center gap-1.5 border border-white/15 backdrop-blur-md shadow-sm"
                  >
                    <Archive className="w-3.5 h-3.5 text-pink-400" />
                    Archive
                  </Button>
                </div>
              </div>
            ) : (
              /* Viewer Toolbar: Quick Reactions + Reply Input */
              <div className="space-y-3">
                {/* Quick Emoji Reaction Pill */}
                <div className="flex items-center justify-around bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-2 py-1">
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleQuickReaction(emoji)}
                      className="text-xl p-1.5 hover:scale-125 active:scale-95 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Message Input & Heart */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder={`Reply to ${currentStory.user.username}...`}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onFocus={() => setIsPaused(true)}
                      onBlur={() => setIsPaused(false)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSendReply();
                        }
                      }}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-full h-11 pl-4 pr-10 focus-visible:ring-1 focus-visible:ring-pink-500 text-sm backdrop-blur-md"
                    />
                    {inputValue.trim() && (
                      <button
                        onClick={() => handleSendReply()}
                        disabled={sendingMessage}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-pink-400 hover:text-pink-300 transition-colors"
                      >
                        {sendingMessage ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleQuickReaction("❤️")}
                    className="rounded-full text-white hover:bg-white/20 w-11 h-11 flex-shrink-0"
                  >
                    <Heart className="w-6 h-6 text-pink-500 fill-pink-500/20 hover:fill-pink-500 transition-colors" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Previous / Next Arrows */}
        <div className="hidden md:block absolute left-6 top-1/2 -translate-y-1/2 z-40">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrevUser || handlePrev}
            className="text-white hover:bg-white/20 rounded-full w-12 h-12 border border-white/10 backdrop-blur-md"
          >
            <ChevronLeft className="w-7 h-7" />
          </Button>
        </div>
        <div className="hidden md:block absolute right-6 top-1/2 -translate-y-1/2 z-40">
          <Button
            variant="ghost"
            size="icon"
            onClick={onNextUser || handleNext}
            className="text-white hover:bg-white/20 rounded-full w-12 h-12 border border-white/10 backdrop-blur-md"
          >
            <ChevronRight className="w-7 h-7" />
          </Button>
        </div>

        {/* Middle of the Screen Viewers Modal Window */}
        <AnimatePresence>
          {viewersOpen && (
            <div
              className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
              onClick={(e) => {
                e.stopPropagation();
                setViewersOpen(false);
                setIsPaused(false);
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 15 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="w-full max-w-sm sm:max-w-md bg-neutral-900 border border-white/20 text-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 px-5 border-b border-white/10 bg-white/5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
                      <Eye className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-base flex items-center gap-2">
                        Story Viewers
                        <span className="text-xs bg-pink-500/20 text-pink-300 font-bold px-2 py-0.5 rounded-full border border-pink-500/40">
                          {viewerCount}
                        </span>
                      </h3>
                      <p className="text-xs text-white/50">People who viewed this story</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setViewersOpen(false);
                      setIsPaused(false);
                    }}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal Viewers List */}
                <div className="p-3 overflow-y-auto max-h-[50vh] space-y-2">
                  {loadingViewers ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-white/60">
                      <Loader2 className="w-7 h-7 animate-spin text-pink-500" />
                      <p className="text-sm font-medium">Checking viewers...</p>
                    </div>
                  ) : viewers.length === 0 ? (
                    <div className="text-center py-12 px-4 space-y-2">
                      <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-white/30">
                        <Users className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-white/90">No views yet</p>
                      <p className="text-xs text-white/50 max-w-xs mx-auto">
                        Followers and friends will appear here as soon as they view your story.
                      </p>
                    </div>
                  ) : (
                    viewers.map((viewer) => (
                      <div
                        key={`${viewer.id}-${viewer.viewed_at}`}
                        onClick={() => {
                          if (viewer.username || viewer.id) {
                            navigate(`/user/${viewer.username || viewer.id}`);
                          }
                        }}
                        className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/10 active:bg-white/15 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 border border-white/20 group-hover:border-pink-500/50 transition-colors">
                            <AvatarImage src={viewer.avatar_url || undefined} />
                            <AvatarFallback className="bg-gradient-to-tr from-[#f09433] to-[#bc1888] text-white font-bold text-sm">
                              {viewer.username?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold text-sm text-white group-hover:text-pink-300 transition-colors">
                              {viewer.username}
                            </p>
                            {viewer.full_name && (
                              <p className="text-xs text-white/50">{viewer.full_name}</p>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-white/40">
                          {formatDistanceToNow(new Date(viewer.viewed_at), { addSuffix: true })}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-3 px-4 border-t border-white/10 bg-white/5 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setViewersOpen(false);
                      setIsPaused(false);
                    }}
                    className="rounded-xl text-white/80 hover:text-white hover:bg-white/10 text-xs font-semibold px-4"
                  >
                    Close
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Alert Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-neutral-900 border border-white/15 text-white rounded-2xl max-w-sm z-[1000000]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white text-lg font-bold">Delete Story?</AlertDialogTitle>
              <AlertDialogDescription className="text-neutral-400 text-sm">
                This story will be permanently removed from your feed and cannot be recovered.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4 gap-2">
              <AlertDialogCancel
                disabled={deleting}
                onClick={() => { setDeleteDialogOpen(false); setIsPaused(false); }}
                className="bg-transparent border-white/20 text-white hover:bg-white/10 rounded-xl"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={deleting}
                onClick={handleDeleteStory}
                className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </AnimatePresence>
  );
};
