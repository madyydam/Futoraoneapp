import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import GameLeaderboard from "@/components/GameLeaderboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const LeaderboardFull = () => {
    const navigate = useNavigate();
    const [userId, setUserId] = useState<string | undefined>(undefined);
    const [view, setView] = useState<"global" | "gamer">("global");

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserId(user.id);
        };
        getUser();
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
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full hover:bg-primary/5 group"
                        onClick={handleBack}
                    >
                        <ArrowLeft className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-bold hidden sm:inline">Back</span>
                    </Button>

                    <Tabs value={view} onValueChange={(v: any) => setView(v)} className="w-full sm:w-[320px]">
                        <TabsList className="grid w-full grid-cols-2 p-1 bg-muted/50 rounded-full h-11">
                            <TabsTrigger value="global" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2 text-xs uppercase font-bold tracking-wider">
                                <Zap className="w-3.5 h-3.5" /> Global
                            </TabsTrigger>
                            <TabsTrigger value="gamer" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2 text-xs uppercase font-bold tracking-wider">
                                <Trophy className="w-3.5 h-3.5" /> Gamers
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <div className="w-10 sm:hidden" /> {/* Spacer for symmetry on mobile */}
                </div>
            </div>

            <main className="max-w-4xl mx-auto p-4 md:p-8">
                <div className="bg-card dark:bg-card/30 backdrop-blur-md rounded-[2.5rem] border border-border/50 shadow-xl overflow-hidden min-h-[70vh]">
                    <GameLeaderboard currentUserId={userId} isWidget={false} variant={view} />
                </div>
            </main>

            <BottomNav />
        </div>
    );
};

export default LeaderboardFull;
