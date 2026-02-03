import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Zap, Film, Bell, Rocket, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { HelpButton } from "@/components/tour/HelpButton";

interface FeedHeaderProps {
    unreadCount?: number;
}

export const FeedHeader = memo(({ unreadCount = 0 }: FeedHeaderProps) => {
    const navigate = useNavigate();
    const [isStandalone, setIsStandalone] = useState(true);

    useEffect(() => {
        const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        setIsStandalone(!!checkStandalone);
    }, []);

    return (
        <header className="sticky top-0 z-50 bg-card border-b border-black/20 dark:border-border shadow-sm">
            <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold gradient-text">FutoraOne</h1>
                    <div className="opacity-70 mt-1">
                        <HelpButton currentPageId="feed" />
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Button
                        id="ai-tools-btn"
                        size="icon"
                        variant="ghost"
                        className="relative w-12 h-12 mr-2 animate-blink-glow bg-primary/10 rounded-full hover:bg-primary/20 transition-all"
                        onClick={() => navigate("/ai-tools")}
                    >
                        <Zap className="w-8 h-8 text-primary" />
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                        </span>
                    </Button>
                    <Button
                        id="rocket-btn"
                        size="icon"
                        variant="ghost"
                        className="relative w-10 h-10 mr-2 hover:bg-muted transition-all"
                        onClick={() => navigate("/upcoming-features")}
                    >
                        <Rocket className="w-6 h-6 text-foreground" />
                    </Button>
                    <Button
                        id="notifications-btn"
                        size="icon"
                        variant="ghost"
                        className="relative"
                        onClick={() => navigate("/notifications")}
                    >
                        <Bell className="w-5 h-5" />
                        <span className={`absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full ${unreadCount > 0 ? 'animate-blink-glow' : ''}`}></span>
                    </Button>
                </div>
            </div>
        </header>
    );
});

FeedHeader.displayName = "FeedHeader";
