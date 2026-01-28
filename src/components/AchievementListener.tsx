import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
    Trophy,
    Award,
    Star,
    Zap,
    Footprints,
    PenTool,
    Heart,
    Code,
    Bug,
    Flame
} from "lucide-react";

// Achievement definitions (stored locally since we don't have the table yet)
const ACHIEVEMENTS = [
    { id: 'first_post', title: 'First Post', description: 'Created your first post!', icon_name: 'PenTool', xp_reward: 50 },
    { id: 'first_like', title: 'Liked!', description: 'Received your first like', icon_name: 'Heart', xp_reward: 25 },
    { id: 'first_follower', title: 'Rising Star', description: 'Got your first follower', icon_name: 'Star', xp_reward: 75 },
    { id: 'code_master', title: 'Code Master', description: 'Shared 10 code snippets', icon_name: 'Code', xp_reward: 100 },
    { id: 'bug_hunter', title: 'Bug Hunter', description: 'Helped debug 5 issues', icon_name: 'Bug', xp_reward: 150 },
    { id: 'on_fire', title: 'On Fire!', description: '7-day activity streak', icon_name: 'Flame', xp_reward: 200 },
];

// Reuse the IconMap logic
const IconMap: { [key: string]: React.ElementType } = {
    'Footprints': Footprints,
    'PenTool': PenTool,
    'Heart': Heart,
    'Code': Code,
    'Bug': Bug,
    'Flame': Flame,
    'Trophy': Trophy,
    'Award': Award,
    'Zap': Zap,
    'Star': Star
};

export const AchievementListener = () => {
    const { toast } = useToast();

    useEffect(() => {
        // Listen for custom achievement events dispatched from other components
        const handleAchievementUnlock = (event: CustomEvent<{ achievementId: string }>) => {
            const achievement = ACHIEVEMENTS.find(a => a.id === event.detail.achievementId);
            if (!achievement) return;

            const IconComponent = IconMap[achievement.icon_name] || Trophy;

            toast({
                title: "Achievement Unlocked! 🏆",
                description: (
                    <div className="flex flex-col gap-1">
                        <p className="font-semibold text-primary">{achievement.title}</p>
                        <p className="text-xs">{achievement.description}</p>
                        <div className="flex items-center gap-1 text-xs text-orange-500 font-medium mt-1">
                            <Zap className="w-3 h-3" />
                            +{achievement.xp_reward} XP
                        </div>
                    </div>
                ),
                duration: 5000,
                className: "border-2 border-primary/20",
            });
        };

        window.addEventListener('achievement-unlocked', handleAchievementUnlock as EventListener);

        return () => {
            window.removeEventListener('achievement-unlocked', handleAchievementUnlock as EventListener);
        };
    }, [toast]);

    return null; // This component handles side effects only
};

// Helper function to trigger achievement unlock from anywhere in the app
export const unlockAchievement = (achievementId: string) => {
    window.dispatchEvent(new CustomEvent('achievement-unlocked', { 
        detail: { achievementId } 
    }));
};
