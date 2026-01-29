import React, { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Rocket,
    Mic,
    Video,
    Phone,
    MessageSquare,
    Crown,
    Sparkles,
    Shield,
    Globe,
    Zap,
    ChevronLeft,
    Code2,
    Trophy,
    Swords,
    Award,
    PenTool
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { WaitlistTicket } from "@/components/WaitlistTicket";
import { supabase } from "@/integrations/supabase/client";

const FeatureCard = memo(({ icon: Icon, title, description, badge }: { icon: any, title: string, description: string, badge?: string }) => (
    <div className="relative group p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 backdrop-blur-sm">
        {badge && (
            <div className="absolute -top-3 -right-2 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full shadow-lg animate-pulse">
                {badge}
            </div>
        )}
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
            <Icon className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
    </div>
));

FeatureCard.displayName = "FeatureCard";

const UpcomingFeatures = memo(() => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [ticketData, setTicketData] = useState<{ number: number; username: string; avatarUrl?: string } | null>(null);
    const [showTicket, setShowTicket] = useState(false);

    const features = [
        {
            icon: Mic,
            title: "Voice Chat Rooms",
            description: "Drop-in audio conversations for developers to discuss tech, brainstorm, or just hang out.",
            badge: "In Dev"
        },
        {
            icon: Phone,
            title: "Voice Calling",
            description: "Instant high-quality voice calls with your tech matches or group members.",
            badge: "Coming Soon"
        },
        {
            icon: Video,
            title: "Video Calling",
            description: "Face-to-face networking and collaborative debugging sessions directly in the app.",
            badge: "Coming Soon"
        },
        {
            icon: MessageSquare,
            title: "Advanced Group Chats",
            description: "Threaded conversations, file sharing, and integrated code snippets for teams.",
            badge: "Next Week"
        },
        {
            icon: Zap,
            title: "Interactive Roadmaps",
            description: "Real-time collaborative learning paths with AI-powered progress tracking.",
            badge: "Beta"
        },
        {
            icon: Crown,
            title: "Futora Pro",
            description: "Exclusive access to premium gigs, advanced search filters, and profile boosts.",
            badge: "Q1 2024"
        },
        {
            icon: Code2,
            title: "AI Code Companion",
            description: "Your personal AI pair programmer available 24/7 for debugging and optimization.",
            badge: "Beta"
        },
        {
            icon: Trophy,
            title: "Live Hackathons",
            description: "Compete in real-time coding challenges with the community to win prizes.",
            badge: "Monthly"
        },
        {
            icon: Swords,
            title: "Code Review Arena",
            description: "Gamified code review system where you earn XP by reviewing others' code.",
            badge: "New"
        },
        {
            icon: Award,
            title: "Verified Tech Assessments",
            description: "Take skill tests to verify your expertise and get a 'Verified' badge on your profile.",
            badge: "Coming Soon"
        },
        {
            icon: PenTool,
            title: "Developer Blog Platform",
            description: "Built-in blogging platform with syntax highlighting to share your knowledge.",
            badge: "In Dev"
        }
    ];

    const handleJoinWaitlist = async () => {
        try {
            setIsLoading(true);
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                toast.error("Please login to join the waitlist");
                navigate("/auth");
                return;
            }

            // Fetch username from profiles
            const { data: profile } = await supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', session.user.id)
                .single();

            // Generate a waitlist position based on localStorage (since waitlist table doesn't exist)
            const existingPosition = localStorage.getItem('futora_waitlist_position');
            let position: number;

            if (existingPosition) {
                position = parseInt(existingPosition, 10);
                toast.info("You are already on the waitlist!", {
                    description: "Here is your ticket again."
                });
            } else {
                // Generate a random position between 1-1000
                position = Math.floor(Math.random() * 1000) + 1;
                localStorage.setItem('futora_waitlist_position', position.toString());
                toast.success("Welcome to the future!", {
                    description: "Your VIP ticket has been generated."
                });
            }

            setTicketData({
                number: position,
                username: profile?.username || 'User',
                avatarUrl: profile?.avatar_url
            });

            setShowTicket(true);

        } catch (error) {
            console.error("Error joining waitlist:", error);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-white flex flex-col pb-20">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-black/60 backdrop-blur-md border-b border-white/10 px-4 py-4">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(-1)}
                        className="text-white hover:bg-white/10 rounded-full"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Rocket className="w-5 h-5 text-primary" />
                        Next Horizon
                    </h1>
                    <div className="w-10 h-10" />
                </div>
            </header>

            <main className="flex-1 max-w-2xl mx-auto px-4 py-8">
                {/* Hero Section */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
                        <Sparkles className="w-4 h-4" />
                        Building the Future of Tech Social
                    </div>
                    <h2 className="text-4xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                        Exciting Features <br />Coming Soon
                    </h2>
                    <p className="text-gray-400 max-w-md mx-auto">
                        We're working hard to bring you the best tools for networking,
                        collaboration, and growth. Here's what's on our immediate roadmap.
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {features.map((feature, index) => (
                        <FeatureCard key={index} {...feature} />
                    ))}
                </div>

                {/* Community Section */}
                <div className="mt-12 p-8 rounded-3xl bg-gradient-to-br from-primary/20 to-purple-500/10 border border-primary/20 text-center">
                    <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Want to shape Futora?</h3>
                    <p className="text-gray-400 text-sm mb-6">
                        Join our beta tester group and get early access to these features before anyone else.
                    </p>
                    <Button
                        onClick={handleJoinWaitlist}
                        disabled={isLoading}
                        className="rounded-full px-8 py-6 text-lg font-bold shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
                    >
                        {isLoading ? "Joining..." : "Join Waitlist"}
                    </Button>
                </div>

                <div className="mt-8 text-center text-gray-500 text-xs flex items-center justify-center gap-2">
                    <Globe className="w-3 h-3" />
                    Deploying updates globally every week
                </div>
            </main>

            <BottomNav />

            {/* Ticket Dialog */}
            <Dialog open={showTicket} onOpenChange={setShowTicket}>
                <DialogContent className="sm:max-w-md bg-transparent border-none shadow-none p-0 flex items-center justify-center">
                    {ticketData && (
                        <WaitlistTicket
                            ticketNumber={ticketData.number}
                            username={ticketData.username}
                            avatarUrl={ticketData.avatarUrl}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
});

UpcomingFeatures.displayName = "UpcomingFeatures";

export default UpcomingFeatures;