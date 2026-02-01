import { useState, useEffect, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import AIChat from "@/components/AIChat";
import VideoBackground from "@/components/VideoBackground";
import { useToast } from "@/hooks/use-toast";
import { useAIMentor } from "@/hooks/useAIMentor";
import { Sparkles } from "lucide-react";

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
}

type AIGender = 'female' | 'male';

export const AICompanionView = () => {
    const { toast } = useToast();
    const [aiGender, setAiGender] = useState<AIGender>('female');
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: "yes",
            sender: 'ai',
            timestamp: new Date()
        }
    ]);

    const [isTyping, setIsTyping] = useState(false);

    // Reset chat when gender changes
    useEffect(() => {
        const initialMessage = aiGender === 'female'
            ? "yes"
            : "Hey, I'm Arjun. Ready to build something incredible together?";

        setMessages([{
            id: Date.now().toString(),
            text: initialMessage,
            sender: 'ai',
            timestamp: new Date()
        }]);
        setIsTyping(false);
    }, [aiGender]);

    // Use Real AI Hook
    const { messages: aiMessages, sendMessage, isLoading: isAiLoading } = useAIMentor();

    // Sync AI hook messages to local UI state for display
    useEffect(() => {
        if (aiMessages.length === 0) return;

        const uiMessages: Message[] = aiMessages.map((m, i) => ({
            id: i.toString(),
            text: m.content,
            sender: m.role === 'user' ? 'user' : 'ai',
            timestamp: new Date()
        }));

        // Prepend valid initial greeting if empty or just started
        if (uiMessages.length === 0) {
            const initialMessage = aiGender === 'female'
                ? "yes"
                : "Hey, I'm Arjun. Ready to build something incredible together?";

            setMessages([{
                id: 'init',
                text: initialMessage,
                sender: 'ai',
                timestamp: new Date()
            }]);
        } else {
            const initialMessage = aiGender === 'female'
                ? "yes"
                : "Hey, I'm Arjun. Ready to build something incredible together?";

            const initMsgObj: Message = {
                id: 'init',
                text: initialMessage,
                sender: 'ai',
                timestamp: new Date()
            };

            setMessages([initMsgObj, ...uiMessages]);
        }

        setIsTyping(false); // Stop typing when message arrives

        // If last message is user, set typing true (waiting for AI)
        const last = aiMessages[aiMessages.length - 1];
        if (last.role === 'user') setIsTyping(true);

    }, [aiMessages, aiGender]);


    // Optimize: useCallback for stable function reference passed to AIChat
    const handleSendMessage = useCallback(async (text: string) => {
        setIsTyping(true);

        try {
            const mode = aiGender === 'female' ? 'female_companion' : 'male_companion';
            await sendMessage(text, mode);
        } catch (error) {
            console.error("AI Error:", error);
            toast({
                title: "Connection Error",
                description: "Could not connect to AI service.",
                variant: "destructive"
            });
            setIsTyping(false);
        }
    }, [aiGender, sendMessage, toast]);


    const aiName = aiGender === 'female' ? 'Riya' : 'Arjun';
    const themeColor = aiGender === 'female' ? 'pink' : 'cyan';
    const gradientFrom = aiGender === 'female' ? 'from-pink-600' : 'from-cyan-600';
    const gradientTo = aiGender === 'female' ? 'to-purple-600' : 'to-blue-600';

    // Video sources - Memoized
    const videoSrc = aiGender === 'female'
        ? "/pookie-girl.png"
        : "https://assets.mixkit.co/videos/preview/mixkit-futuristic-holographic-interface-992-large.mp4";

    const MemoizedVideo = useMemo(() => (
        <VideoBackground videoSrc={videoSrc} aiGender={aiGender} />
    ), [videoSrc, aiGender]);

    return (
        <div className="relative h-[calc(100dvh-130px)] overflow-hidden w-full transition-colors duration-500">
            {/* Background Layer (Video/Image) */}
            {MemoizedVideo}

            {/* Interactive Overlay & Chat */}
            <div className="relative z-10 flex flex-col h-full">
                {/* Top Bar with 3D Toggle */}
                <div className="flex justify-between items-center p-4 bg-gradient-to-b from-black/80 to-transparent">
                    <div>
                        <h1 className="text-xl font-bold text-white flex items-center gap-2">
                            {aiName}
                            <Badge className={`bg-${themeColor}-500/20 text-${themeColor}-400 border-${themeColor}-500/50`}>
                                V2.0
                            </Badge>
                        </h1>
                    </div>
                    <div className="flex items-center gap-3 bg-black/30 backdrop-blur-md p-1.5 rounded-full border border-white/10">
                        <span className={`text-[10px] uppercase font-bold px-2 ${aiGender === 'female' ? 'text-pink-400' : 'text-muted-foreground'}`}>Riya</span>
                        <Switch
                            checked={aiGender === 'male'}
                            onCheckedChange={(checked) => setAiGender(checked ? 'male' : 'female')}
                            className="data-[state=checked]:bg-cyan-500 data-[state=unchecked]:bg-pink-500"
                        />
                        <span className={`text-[10px] uppercase font-bold px-2 ${aiGender === 'male' ? 'text-cyan-400' : 'text-muted-foreground'}`}>Arjun</span>
                    </div>
                </div>

                {/* Chat Area - Live & Operational */}
                <div className="relative flex-1 overflow-hidden">
                    <AIChat
                        messages={messages}
                        onSendMessage={handleSendMessage}
                        aiName={aiName}
                        themeColor={themeColor}
                        gradientFrom={gradientFrom}
                        gradientTo={gradientTo}
                        aiGender={aiGender}
                        isTyping={isTyping || isAiLoading}
                    />
                </div>
            </div>
        </div>
    );
};
