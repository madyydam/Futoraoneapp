import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";


interface Story {
  id: string;
  user_id: string;
  media_url: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    verification_category: string | null;
  };
}

interface StoriesBarProps {
  currentUserId: string | undefined;
}

export const StoriesBar = ({ currentUserId }: StoriesBarProps) => {
  const [stories, setStories] = useState<Story[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStories();

    // Subscribe to new stories
    const channel = supabase
      .channel("stories-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stories",
        },
        () => {
          fetchStories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const fetchStories = async () => {
    if (!currentUserId) return;

    const { data } = await supabase
      .from("stories")
      .select(
        `
        id,
        user_id,
        media_url,
        created_at,
        profiles!stories_user_id_fkey(username, avatar_url, verification_category)
      `
      )
      .order("created_at", { ascending: false });

    if (data) {
      // Group stories by user, only show latest
      const uniqueUsers = new Map();
      data.forEach((story: any) => {
        if (story.profiles.username?.toLowerCase() === 'sanu') {
          story.profiles.verification_category = 'creator';
        }
        if (!uniqueUsers.has(story.user_id)) {
          uniqueUsers.set(story.user_id, story);
        }
      });
      setStories(Array.from(uniqueUsers.values()));
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 px-4 hide-scrollbar">
      {/* Add story button */}
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        <Button
          variant="outline"
          size="icon"
          className="w-16 h-16 rounded-full border-2 border-dashed border-primary"
          onClick={() => navigate("/create-story")}
        >
          <Plus className="w-6 h-6" />
        </Button>
        <span className="text-xs text-muted-foreground">Your Story</span>
      </div>

      {/* Stories from followed users */}
      {stories.map((story) => {
        const isCreator = story.profiles.verification_category === 'creator';

        return (
          <div
            key={story.id}
            className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer"
            onClick={() => navigate(`/story/${story.user_id}`)}
          >
            <div className="relative">
              <div className={`w-16 h-16 rounded-full p-0.5 ${isCreator
                ? "bg-gradient-to-tr from-yellow-300 via-amber-500 to-yellow-600 shadow-[0_0_10px_rgba(234,179,8,0.5)]"
                : "bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500"
                }`}>
                <Avatar className="w-full h-full border-2 border-background">
                  <AvatarImage src={story.profiles.avatar_url || undefined} />
                  <AvatarFallback>{story.profiles.username[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
              </div>

            </div>
            <span className="text-xs text-foreground truncate max-w-[64px]">
              {story.profiles.username}
            </span>
          </div>
        );
      })}
    </div>
  );
};
