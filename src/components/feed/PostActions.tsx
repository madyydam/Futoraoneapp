import { memo, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, Bookmark } from "lucide-react";
import { motion } from "framer-motion";

interface PostActionsProps {
    likeCount: number;
    commentCount: number;
    isLiked: boolean;
    isSaved: boolean;
    showComments: boolean;
    onLike: (e: React.MouseEvent) => void;
    onComment: () => void;
    onSave: (e: React.MouseEvent) => void;
    onShare: (e: React.MouseEvent) => void;
}

export const PostActions = memo(({
    likeCount,
    commentCount,
    isLiked,
    isSaved,
    showComments,
    onLike,
    onComment,
    onSave,
    onShare
}: PostActionsProps) => {

    const likeButtonClass = useMemo(() =>
        `${isLiked ? "text-red-500 hover:text-red-600" : "hover:text-red-500"} transition-colors`,
        [isLiked]
    );

    const commentButtonClass = useMemo(() =>
        `transition-colors ${showComments ? "text-blue-500" : "hover:text-blue-500"}`,
        [showComments]
    );

    const saveButtonClass = useMemo(() =>
        `${isSaved ? "text-primary hover:text-primary/80" : "hover:text-primary"} transition-colors`,
        [isSaved]
    );

    return (
        <div className="flex items-center justify-between pt-3 border-t border-border/40">
            <div className="flex items-center gap-1 bg-muted/30 rounded-full px-2 py-1">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onLike}
                        className={`rounded-full w-10 h-10 ${likeButtonClass}`}
                    >
                        <Heart
                            className={`w-6 h-6 ${isLiked ? "fill-red-500" : ""} transition-all duration-300`}
                        />
                    </Button>
                </motion.div>
                <span className={`text-sm font-bold min-w-[1.5rem] tabular-nums ${isLiked ? "text-red-500" : "text-muted-foreground"}`}>
                    {likeCount}
                </span>
            </div>

            <div className="flex items-center gap-1 hover:bg-muted/30 rounded-full px-2 py-1 transition-colors">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`rounded-full w-10 h-10 ${commentButtonClass}`}
                        onClick={onComment}
                    >
                        <MessageCircle className="w-6 h-6" />
                    </Button>
                </motion.div>
                <span className="text-sm font-bold text-muted-foreground min-w-[1.5rem] tabular-nums">
                    {commentCount}
                </span>
            </div>

            <div className="flex items-center gap-2">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onSave}
                        className={`rounded-full w-10 h-10 ${saveButtonClass}`}
                    >
                        <Bookmark
                            className={`w-5 h-5 ${isSaved ? "fill-primary" : ""} transition-all duration-300`}
                        />
                    </Button>
                </motion.div>

                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onShare}
                        className="rounded-full w-10 h-10 hover:bg-green-500/10 hover:text-green-600 transition-colors"
                    >
                        <Share2 className="w-5 h-5" />
                    </Button>
                </motion.div>
            </div>
        </div>
    );
});

PostActions.displayName = "PostActions";
