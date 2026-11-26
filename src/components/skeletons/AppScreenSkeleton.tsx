import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const AppScreenSkeleton = React.memo(() => {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-between" aria-busy="true" aria-label="Loading screen">
      {/* Top Header Placeholder */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border/40 px-4 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Skeleton className="h-7 w-20 rounded-lg" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
      </header>

      {/* Main Content Skeleton Feed / Cards */}
      <main className="max-w-2xl w-full mx-auto px-4 py-6 space-y-5 flex-1">
        {/* Story / Horizontal bar placeholder */}
        <div className="flex gap-3 overflow-hidden py-1">
          <Skeleton className="h-16 w-16 rounded-full shrink-0" />
          <Skeleton className="h-16 w-16 rounded-full shrink-0" />
          <Skeleton className="h-16 w-16 rounded-full shrink-0" />
          <Skeleton className="h-16 w-16 rounded-full shrink-0" />
        </div>

        {/* Card 1 */}
        <div className="p-4 rounded-2xl border border-border/40 bg-card/40 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          </div>
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-4/5 rounded" />
          <Skeleton className="h-44 w-full rounded-xl" />
        </div>

        {/* Card 2 */}
        <div className="p-4 rounded-2xl border border-border/40 bg-card/40 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
          </div>
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      </main>

      {/* Bottom Nav Placeholder */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-md border-t border-border/40 py-3 px-6 z-40">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Skeleton className="h-8 w-8 rounded-xl" />
          <Skeleton className="h-8 w-8 rounded-xl" />
          <Skeleton className="h-11 w-11 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-xl" />
          <Skeleton className="h-8 w-8 rounded-xl" />
        </div>
      </div>
    </div>
  );
});

AppScreenSkeleton.displayName = "AppScreenSkeleton";
