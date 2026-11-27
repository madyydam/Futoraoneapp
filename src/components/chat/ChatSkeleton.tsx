import React, { memo } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatSkeletonProps {
  onBack?: () => void;
  isGroup?: boolean;
}

export const ChatSkeleton: React.FC<ChatSkeletonProps> = memo(({ onBack, isGroup = false }) => {
  return (
    <div
      className="h-screen bg-background flex flex-col overflow-hidden select-none"
      aria-busy="true"
      aria-label="Loading conversation"
    >
      {/* Header Skeleton */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b border-border p-3 sm:p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-full h-9 w-9 text-muted-foreground flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          {/* Avatar Skeleton */}
          <div className="relative flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-muted/70 animate-pulse border-2 border-primary/10" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-muted/60 rounded-full border-2 border-background" />
          </div>

          {/* User / Group Info Skeleton */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="h-4 w-28 sm:w-36 bg-muted/80 rounded-md animate-pulse" />
            <div className="h-3 w-16 sm:w-24 bg-muted/50 rounded-md animate-pulse" />
          </div>
        </div>

        {/* Action icons skeleton */}
        <div className="flex items-center gap-1 sm:gap-2">
          {isGroup && (
            <div className="w-8 h-8 rounded-full bg-muted/40 animate-pulse hidden sm:block" />
          )}
          <div className="w-8 h-8 rounded-full bg-muted/40 animate-pulse" />
        </div>
      </div>

      {/* Messages Canvas Skeleton */}
      <div className="flex-1 overflow-hidden p-4 space-y-4 max-w-3xl w-full mx-auto flex flex-col justify-end">
        {/* Date separator pill */}
        <div className="flex justify-center my-2">
          <div className="h-5 w-24 rounded-full bg-muted/40 animate-pulse" />
        </div>

        {/* Incoming Message 1 */}
        <div className="flex items-end gap-2 max-w-[78%] sm:max-w-[70%]">
          <div className="w-7 h-7 rounded-full bg-muted/60 animate-pulse flex-shrink-0 mb-1" />
          <div className="space-y-1.5 flex-1">
            <div className="h-12 w-48 sm:w-64 rounded-2xl rounded-bl-sm bg-muted/60 animate-pulse border border-border/30" />
            <div className="h-2 w-10 bg-muted/40 rounded-full ml-1" />
          </div>
        </div>

        {/* Incoming Message 2 */}
        <div className="flex items-end gap-2 max-w-[65%] sm:max-w-[55%] ml-9">
          <div className="space-y-1 flex-1">
            <div className="h-9 w-36 sm:w-48 rounded-2xl bg-muted/50 animate-pulse border border-border/30" />
          </div>
        </div>

        {/* Outgoing Message 1 */}
        <div className="flex items-end justify-end gap-2 max-w-[78%] sm:max-w-[70%] ml-auto">
          <div className="space-y-1.5 flex flex-col items-end flex-1">
            <div className="h-14 w-52 sm:w-72 rounded-2xl rounded-br-sm bg-primary/20 dark:bg-primary/25 animate-pulse border border-primary/20" />
            <div className="h-2 w-12 bg-primary/30 rounded-full mr-1" />
          </div>
        </div>

        {/* Incoming Message 3 */}
        <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[75%]">
          <div className="w-7 h-7 rounded-full bg-muted/60 animate-pulse flex-shrink-0 mb-1" />
          <div className="space-y-1.5 flex-1">
            <div className="h-16 w-56 sm:w-80 rounded-2xl rounded-bl-sm bg-muted/60 animate-pulse border border-border/30" />
            <div className="h-2 w-10 bg-muted/40 rounded-full ml-1" />
          </div>
        </div>

        {/* Outgoing Message 2 */}
        <div className="flex items-end justify-end gap-2 max-w-[60%] sm:max-w-[50%] ml-auto">
          <div className="space-y-1 flex flex-col items-end flex-1">
            <div className="h-9 w-32 sm:w-44 rounded-2xl rounded-br-sm bg-primary/20 dark:bg-primary/25 animate-pulse border border-primary/20" />
          </div>
        </div>

        {/* Outgoing Message 3 */}
        <div className="flex items-end justify-end gap-2 max-w-[75%] sm:max-w-[65%] ml-auto">
          <div className="space-y-1.5 flex flex-col items-end flex-1">
            <div className="h-10 w-44 sm:w-60 rounded-2xl rounded-br-sm bg-primary/20 dark:bg-primary/25 animate-pulse border border-primary/20" />
            <div className="h-2 w-14 bg-primary/30 rounded-full mr-1" />
          </div>
        </div>
      </div>

      {/* Input Bar Skeleton */}
      <div className="p-3 bg-card/90 backdrop-blur-md border-t border-border flex items-center gap-2 max-w-3xl w-full mx-auto">
        <div className="w-10 h-10 rounded-full bg-muted/40 animate-pulse flex-shrink-0" />
        <div className="flex-1 h-11 rounded-full bg-muted/40 animate-pulse" />
        <div className="w-10 h-10 rounded-full bg-primary/30 animate-pulse flex-shrink-0" />
      </div>
    </div>
  );
});

ChatSkeleton.displayName = "ChatSkeleton";
