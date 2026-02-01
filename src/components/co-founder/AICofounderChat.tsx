import { useState, useEffect, useRef } from "react";
import { useAIMentor } from "@/hooks/useAIMentor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Bot, Sparkles, User, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    type?: 'text' | 'action';
    actionData?: any;
}

interface AICofounderChatProps {
    onApplyFilter?: (filter: string) => void;
}

export const AICofounderChat = ({ onApplyFilter }: AICofounderChatProps) => {
    // Use Real AI Hook
    const { messages: aiMessages, sendMessage, isLoading: isAiLoading } = useAIMentor();

    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false); // Can use isAiLoading but local state gives more control if needed? Actually isAiLoading is better.
    const scrollRef = useRef<HTMLDivElement>(null);

    // Sync AI hook messages to local UI state for display
    useEffect(() => {
        if (aiMessages.length === 0) {
            // Ensure initial greeting is present
            setMessages([{
                id: "1",
                text: "Namaste! I'm your AI Co-founder Arya. I can help you validate your idea, suggest equity splits, or find the perfect match. What's on your mind today?",
                sender: 'ai',
                type: 'text'
            }]);
            return;
        }

        const uiMessages: Message[] = aiMessages.map((m, i) => ({
            id: i.toString(),
            text: m.content,
            sender: m.role === 'user' ? 'user' : 'ai',
            type: 'text'
        }));

        // Append to initial
        const initialMsg: Message = {
            id: "1",
            text: "Namaste! I'm your AI Co-founder Arya. I can help you validate your idea, suggest equity splits, or find the perfect match. What's on your mind today?",
            sender: 'ai',
            type: 'text'
        };

        setMessages([initialMsg, ...uiMessages]);

    }, [aiMessages]);

    useEffect(() => {
        setIsTyping(isAiLoading);
    }, [isAiLoading]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;

        setInputValue("");
        // isTyping handled by useEffect on isAiLoading

        try {
            await sendMessage(inputValue, 'mentor');
        } catch (error) {
            console.error("AI Error:", error);
        }
    };

    return (
        <Card className="h-[500px] flex flex-col border-none shadow-none bg-transparent">
            <CardContent className="flex-1 p-4 flex flex-col h-full relative overflow-hidden">
                <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
                    <div className="space-y-4">
                        {messages.map((msg) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={msg.id}
                                className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                            >
                                <Avatar className={`w-8 h-8 ${msg.sender === 'ai' ? 'border-pink-500/50' : 'border-blue-500/50'} border-2`}>
                                    {msg.sender === 'ai' ? (
                                        <AvatarImage src="/ai-avatar.png" />
                                    ) : null}
                                    <AvatarFallback className={msg.sender === 'ai' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}>
                                        {msg.sender === 'ai' ? <Bot size={16} /> : <User size={16} />}
                                    </AvatarFallback>
                                </Avatar>

                                <div className={`space-y-2 max-w-[80%]`}>
                                    <div className={`p-3 rounded-2xl text-sm ${msg.sender === 'user'
                                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                                        : 'bg-muted text-foreground rounded-tl-none'
                                        }`}>
                                        {msg.text}
                                    </div>

                                    {msg.actionData && msg.actionData.suggestions && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {msg.actionData.suggestions.map((s: string) => (
                                                <Button
                                                    key={s}
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-xs h-7 border-pink-500/30 text-pink-600 hover:bg-pink-50"
                                                    onClick={() => onApplyFilter && onApplyFilter(s)}
                                                >
                                                    <Sparkles className="w-3 h-3 mr-1" />
                                                    See {s} Matches
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}

                        {isTyping && (
                            <div className="flex gap-3">
                                <Avatar className="w-8 h-8 border-2 border-pink-500/50">
                                    <AvatarFallback className="bg-pink-100"><Bot size={16} /></AvatarFallback>
                                </Avatar>
                                <div className="bg-muted p-3 rounded-2xl rounded-tl-none w-16 flex items-center justify-center">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="mt-4 flex gap-2">
                    <Input
                        placeholder="Ask your AI Co-founder..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="rounded-full bg-secondary/50 border-0 focus-visible:ring-1 focus-visible:ring-pink-500 px-4"
                    />
                    <Button
                        size="icon"
                        className="rounded-full bg-gradient-to-r from-pink-500 to-orange-500 hover:opacity-90 transition-opacity"
                        onClick={handleSendMessage}
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>

                {/* Coming Soon Overlay */}
                <div className="absolute inset-0 z-50 bg-background/40 backdrop-blur-[1px] flex items-center justify-center p-6 text-center">
                    <div className="bg-white/90 dark:bg-black/90 border border-border p-6 rounded-2xl shadow-xl max-w-[280px] animate-in fade-in zoom-in duration-300">
                        <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Sparkles className="w-6 h-6 text-pink-600" />
                        </div>
                        <h4 className="font-bold text-lg mb-1">Coming Soon</h4>
                        <p className="text-sm text-muted-foreground leading-tight">
                            Arya is currently training to be the world's best co-founder. Check back in a few days!
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
