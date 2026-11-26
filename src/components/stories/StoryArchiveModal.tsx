import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Archive, Trash2, Calendar, Eye, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { StoryViewer, Story } from "@/components/StoryViewer";
import { format } from "date-fns";

interface StoryArchiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  username: string;
  avatarUrl: string | null;
}

interface ArchivedStoryItem {
  id: string;
  media_url: string;
  media_type: "image" | "video";
  caption: string | null;
  created_at: string;
  expires_at: string;
  view_count?: number;
}

export const StoryArchiveModal = ({
  open,
  onOpenChange,
  userId,
  username,
  avatarUrl,
}: StoryArchiveModalProps) => {
  const [archivedStories, setArchivedStories] = useState<ArchivedStoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchArchive = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Fetch user's own past/expired stories (allowed by RLS: user_id = auth.uid())
      const { data, error } = await supabase
        .from("stories")
        .select(`
          id,
          media_url,
          media_type,
          caption,
          created_at,
          expires_at
        `)
        .eq("user_id", userId)
        .lte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch view counts for each archived story
      const storiesWithCounts = await Promise.all(
        (data || []).map(async (story: any) => {
          const { count } = await supabase
            .from("story_views")
            .select("*", { count: "exact", head: true })
            .eq("story_id", story.id);
          return {
            ...story,
            view_count: count || 0,
          };
        })
      );

      setArchivedStories(storiesWithCounts);
    } catch (err: any) {
      console.error("Error fetching story archive:", err);
      toast({
        title: "Error fetching archive",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchArchive();
    }
  }, [open, userId]);

  const handleDeletePermanently = async (storyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(storyId);
    try {
      const { error } = await supabase.from("stories").delete().eq("id", storyId);
      if (error) throw error;

      setArchivedStories((prev) => prev.filter((s) => s.id !== storyId));
      toast({ title: "Story permanently deleted from archive" });
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const viewerStories: Story[] = archivedStories.map((s) => ({
    id: s.id,
    url: s.media_url,
    type: s.media_type,
    caption: s.caption,
    createdAt: s.created_at,
    user: {
      id: userId,
      username,
      avatar_url: avatarUrl,
    },
  }));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl max-h-[85vh] bg-card border-border overflow-hidden flex flex-col p-6 rounded-3xl">
          <DialogHeader className="pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Archive className="w-5 h-5 text-pink-500" />
              Story Archive
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Only you can see your archived stories. Expired after 24 hours.
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto mt-4 pr-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
                <span className="text-sm">Loading memories...</span>
              </div>
            ) : archivedStories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground space-y-2">
                <div className="w-14 h-14 rounded-full bg-pink-500/10 flex items-center justify-center mb-1">
                  <Archive className="w-7 h-7 text-pink-500/50" />
                </div>
                <p className="font-semibold text-foreground text-sm">No archived stories yet</p>
                <p className="text-xs max-w-xs">
                  Stories you publish will automatically be preserved here after they expire.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {archivedStories.map((story, index) => (
                  <div
                    key={story.id}
                    onClick={() => setSelectedStoryIndex(index)}
                    className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-black cursor-pointer group shadow-sm hover:shadow-md hover:scale-[1.02] transition-all"
                  >
                    {story.media_type === "image" ? (
                      <img
                        src={story.media_url}
                        alt="Archived story"
                        className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                      />
                    ) : (
                      <video
                        src={story.media_url}
                        className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                        muted
                      />
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />

                    {/* Date Badge */}
                    <div className="absolute top-2 left-2 flex items-center gap-1 text-[10px] text-white/90 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full font-semibold">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(story.created_at), "MMM d")}
                    </div>

                    {/* View Count */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] text-white/90 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full font-medium">
                      <Eye className="w-3 h-3 text-pink-400" />
                      {story.view_count || 0}
                    </div>

                    {/* Delete Permanently Button */}
                    <button
                      onClick={(e) => handleDeletePermanently(story.id, e)}
                      disabled={deletingId === story.id}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-red-600 text-white/70 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete permanently"
                    >
                      {deletingId === story.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Replay Archived Story in Full Viewer */}
      {selectedStoryIndex !== null && viewerStories.length > 0 && (
        <StoryViewer
          stories={viewerStories}
          initialStoryIndex={selectedStoryIndex}
          onClose={() => setSelectedStoryIndex(null)}
          onStoryDeleted={(deletedId) => {
            setArchivedStories((prev) => prev.filter((s) => s.id !== deletedId));
          }}
        />
      )}
    </>
  );
};
