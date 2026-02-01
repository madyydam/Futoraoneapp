import { useRef, useEffect, useState, memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { motion } from "framer-motion";

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
}

interface AIChatProps {
    messages: Message[];
    onSendMessage: (text: string) => void;
    aiName: string;
    themeColor: string;
    gradientFrom: string;
    gradientTo: string;
    aiGender: 'female' | 'male';
    isTyping?: boolean;
}

const AIChat = memo(({
    messages,
    onSendMessage,
    aiName,
    themeColor,
    gradientFrom,
    gradientTo,
    aiGender,
    isTyping = false
}: AIChatProps) => {
    const [inputValue, setInputValue] = useState(""); // Local state
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    return (
        <div className="flex flex-col h-full">
            {/* Chat Area */}
            <ScrollArea className="flex-1 px-4">
                <div className="space-y-6 pb-4 pt-4">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {msg.sender === 'ai' && (
                                <Avatar className={`w-10 h-10 border-2 border-${themeColor}-500/50 shadow-[0_0_15px_rgba(255,255,255,0.2)]`}>
                                    <AvatarImage src={aiGender === 'female' ? "/ai-avatar.png" : "/arjun-avatar.png"} className="object-cover" />
                                    <AvatarFallback>{aiName[0]}</AvatarFallback>
                                </Avatar>
                            )}
                            <div
                                className={`max-w-[80%] px-5 py-3 rounded-2xl text-sm backdrop-blur-md shadow-lg ${msg.sender === 'user'
                                    ? `bg-gradient-to-r ${gradientFrom}/90 ${gradientTo}/90 text-white rounded-tr-sm border border-${themeColor}-500/30`
                                    : 'bg-black/40 text-white rounded-tl-sm border border-white/10'
                                    }`}
                            >
                                {msg.text}
                            </div>
                        </div>
                    ))}

                    {/* Typing Indicator */}
                    {isTyping && (
                        <div className="flex gap-3 justify-start">
                            <Avatar className={`w-10 h-10 border-2 border-${themeColor}-500/50 shadow-[0_0_15px_rgba(255,255,255,0.2)]`}>
                                <AvatarImage src={aiGender === 'female' ? "/ai-avatar.png" : "/arjun-avatar.png"} className="object-cover" />
                                <AvatarFallback>{aiName[0]}</AvatarFallback>
                            </Avatar>
                            <div className="bg-black/40 text-white rounded-2xl rounded-tl-sm border border-white/10 px-5 py-3 flex items-center gap-1">
                                <motion.div
                                    className={`w-2 h-2 bg-${themeColor}-500 rounded-full`}
                                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                                />
                                <motion.div
                                    className={`w-2 h-2 bg-${themeColor}-500 rounded-full`}
                                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                                />
                                <motion.div
                                    className={`w-2 h-2 bg-${themeColor}-500 rounded-full`}
                                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                                />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
                <form
                    className="flex gap-3 max-w-md mx-auto"
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!inputValue.trim()) return;
                        onSendMessage(inputValue);
                        setInputValue("");
                    }}
                >
                    <Input
                        placeholder={`Message ${aiName}...`}
                        className={`rounded-full bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-${themeColor}-500 h-12 px-6 backdrop-blur-md`}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                    />
                    <Button type="submit" size="icon" className={`h-12 w-12 rounded-full bg-gradient-to-r ${gradientFrom} ${gradientTo} shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] transition-all shrink-0 border border-white/20`}>
                        <Send className="w-5 h-5 text-white" />
                    </Button>
                </form>
            </div>
        </div>
    );
});

AIChat.displayName = "AIChat";

export default AIChat;
