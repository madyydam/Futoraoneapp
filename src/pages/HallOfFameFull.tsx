import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import GameLeaderboard from "@/components/GameLeaderboard";

const HallOfFameFull = () => {
    const navigate = useNavigate();
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setCurrentUserId(user.id);
        });
    }, []);

    const handleBack = () => {
        if (window.history.length > 2) {
            navigate(-1);
        } else {
            navigate('/feed');
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020817] pb-24">
            {/* Premium Header */}
            <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-4 md:px-8">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full hover:bg-primary/5 group"
                        onClick={handleBack}
                    >
                        <ArrowLeft className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-bold hidden sm:inline">Back</span>
                    </Button>
                    <h1 className="text-sm font-black tracking-widest uppercase text-primary">Hall of Fame</h1>
                    <div className="w-10 sm:hidden" />
                </div>
            </div>

            <main className="max-w-4xl mx-auto p-4 md:p-8">
                <div className="bg-card dark:bg-card/30 backdrop-blur-md rounded-[2.5rem] border border-border/50 shadow-xl overflow-hidden min-h-[70vh]">
                    <GameLeaderboard
                        currentUserId={currentUserId || undefined}
                        isWidget={false}
                        variant="global"
                    />
                </div>
            </main>

            <BottomNav />
        </div>
    );
};

export default HallOfFameFull;