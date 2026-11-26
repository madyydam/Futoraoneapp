import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { StoryViewer, Story } from "@/components/StoryViewer";
import { Loader2 } from "lucide-react";

const StoryView = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStories();
  }, [userId]);

  const fetchStories = async () => {
    if (!userId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("stories")
        .select(`
          id,
          user_id,
          media_url,
          media_type,
          created_at,
          caption,
          profiles:user_id (
            id,
            username,
            avatar_url
          )
        `)
        .eq("user_id", userId)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      const formatted: Story[] = (data || []).map((item: any) => ({
        id: item.id,
        url: item.media_url,
        type: item.media_type,
        caption: item.caption,
        createdAt: item.created_at,
        user: {
          id: item.profiles?.id || item.user_id,
          username: item.profiles?.username || "user",
          avatar_url: item.profiles?.avatar_url || null,
        },
      }));

      setStories(formatted);
    } catch (err) {
      console.error("Error fetching stories in view:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center gap-2 text-white/60">
        <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
        <span>Loading story...</span>
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center text-white/70 space-y-3">
        <p className="text-lg font-semibold text-white">No active stories</p>
        <p className="text-sm text-white/50 max-w-xs">
          This story may have expired or been deleted by the author.
        </p>
        <button
          onClick={() => navigate("/feed")}
          className="mt-4 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
        >
          Back to Feed
        </button>
      </div>
    );
  }

  return (
    <StoryViewer
      stories={stories}
      onClose={() => navigate("/feed")}
      onStoryDeleted={() => fetchStories()}
    />
  );
};

export default StoryView;
