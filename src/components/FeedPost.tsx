import { memo, useState, useCallback, useMemo, Suspense, lazy } from "react";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { triggerHeartConfetti } from "@/utils/confetti";
import { PostHeader } from "@/components/feed/PostHeader";
import { PostContent } from "@/components/feed/PostContent";
import { PostMedia } from "@/components/feed/PostMedia";
import { PostActions } from "@/components/feed/PostActions";

// Lazy load CommentSection
const CommentSection = lazy(() => import("@/components/CommentSection").then(module => ({ default: module.CommentSection })));

interface Post {
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

interface FeedPostProps {
  post: Post;
  currentUser: User | null;
  onLike: (postId: string, isLiked: boolean) => void;
  onSave: (postId: string, isSaved: boolean) => void;
  onShare: (post: Post) => void;
  onDelete: (postId: string) => void;
  index: number;
}

export const FeedPost = memo(({ post, currentUser, onLike, onSave, onShare, onDelete, index }: FeedPostProps) => {
  const navigate = useNavigate();
  const [showComments, setShowComments] = useState(false);

  // Memoize computed values
  const isLiked = useMemo(
    () => post.likes.some(like => like.user_id === currentUser?.id),
    [post.likes, currentUser?.id]
  );

  const isSaved = useMemo(
    () => post.saves?.some(save => save.user_id === currentUser?.id),
    [post.saves, currentUser?.id]
  );

  const isOwner = useMemo(
    () => post.user_id === currentUser?.id,
    [post.user_id, currentUser?.id]
  );

  // Handlers
  const handleLikeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLiked) triggerHeartConfetti();
    onLike(post.id, isLiked);
  }, [isLiked, onLike, post.id]);

  const handleSaveClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSave(post.id, !!isSaved);
  }, [isSaved, onSave, post.id]);

  const handleShareClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onShare(post);
  }, [onShare, post]);

  const handleProfileClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/user/${post.user_id}`);
  }, [navigate, post.user_id]);

  const handlePostClick = useCallback(() => {
    navigate(`/post/${post.id}`);
  }, [navigate, post.id]);

  const handleEdit = useCallback(() => {
    navigate(`/create-post?edit=${post.id}`);
  }, [navigate, post.id]);

  const handleDelete = useCallback(() => {
    onDelete(post.id);
  }, [onDelete, post.id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: Math.min(index * 0.05, 0.3), type: "spring", stiffness: 80, damping: 20 }}
      className="group mb-6"
      style={{ willChange: "transform, opacity", contentVisibility: "auto" }}
      layout="position"
    >
      <Card
        className="overflow-hidden border border-border shadow-sm hover:shadow-lg transition-all duration-300 bg-card rounded-[1.25rem] ring-1 ring-black/5 dark:ring-white/5"
        style={{ contentVisibility: index > 5 ? 'auto' : 'visible', containIntrinsicSize: '0 500px' }}
      >
        {/* Subtle Gradient Glow on Hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 pointer-events-none" />

        <div className="p-0 relative z-10">
          <div className="px-6 pt-6">
            <PostHeader
              profile={post.profiles}
              createdAt={post.created_at}
              content={post.content}
              isOwner={isOwner}
              index={index}
              onProfileClick={handleProfileClick}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>

          <div className="px-6 py-2">
            <PostContent
              content={post.content}
              onClick={handlePostClick}
            />
          </div>

          <div className={post.image_url || post.video_url ? "mt-3" : ""}>
            <PostMedia
              imageUrl={post.image_url}
              videoUrl={post.video_url}
              index={index}
            />
          </div>

          <div className="px-6 pb-4 pt-2">
            <PostActions
              likeCount={post.likes.length}
              commentCount={post.comments.length}
              isLiked={isLiked}
              isSaved={!!isSaved}
              showComments={showComments}
              onLike={handleLikeClick}
              onComment={() => setShowComments(!showComments)}
              onSave={handleSaveClick}
              onShare={handleShareClick}
            />
          </div>

          {/* Comments Section (Heavy, load only when needed) */}
          <AnimatePresence>
            {showComments && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-muted/30"
              >
                <div className="px-6 py-6 border-t border-border/50">
                  <Suspense fallback={<div className="h-20 flex items-center justify-center text-muted-foreground text-sm">Loading comments...</div>}>
                    <CommentSection
                      postId={post.id}
                      postAuthorId={post.user_id}
                      currentUser={currentUser}
                    />
                  </Suspense>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Custom deep comparison for maximum performance
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.post.likes.length === nextProps.post.likes.length &&
    prevProps.post.comments.length === nextProps.post.comments.length &&
    prevProps.post.saves?.length === nextProps.post.saves?.length &&
    prevProps.currentUser?.id === nextProps.currentUser?.id &&
    prevProps.post.created_at === nextProps.post.created_at // Check for content updates
  );
});

FeedPost.displayName = "FeedPost";