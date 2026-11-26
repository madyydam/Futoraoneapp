import { Button } from "@/components/ui/button";
import { Zap, Film, Bell } from "lucide-react";
import { PostSkeleton } from "@/components/PostSkeleton";

export const FeedSkeleton = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-muted/30 to-background">
            <header className="sticky top-0 z-50 bg-card border-b border-black/20 dark:border-border shadow-sm">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
                    <h1 className="text-2xl font-bold gradient-text">One</h1>
                    <div className="flex items-center gap-4">
                        <Button size="icon" variant="ghost" className="relative w-12 h-12 mr-2 bg-primary/5 rounded-full" disabled>
                            <Zap className="w-8 h-8 text-primary/50" />
                        </Button>
                        <Button size="icon" variant="ghost" className="relative w-10 h-10 mr-2" disabled>
                            <Film className="w-6 h-6 text-muted-foreground" />
                        </Button>
                        <Button size="icon" variant="ghost" className="relative" disabled>
                            <Bell className="w-5 h-5 text-muted-foreground" />
                        </Button>
                    </div>
                </div>
            </header>
            <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                <PostSkeleton />
                <PostSkeleton />
                <PostSkeleton />
            </main>
        </div>
    );
};
