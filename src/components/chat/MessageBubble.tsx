import { memo, useMemo } from "react";
import { format } from "date-fns";
import { Check, CheckCheck, Lightbulb, CheckCircle2, Rocket, MoreHorizontal, Sparkles, Target, Zap, Flame, Star, Coffee, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RoomCategory } from "@/hooks/useRoomCategories";

export type MessageType = string;

interface MessageBubbleProps {
    id: string;
    content: string;
    createdAt: string;
    isMe: boolean;
    readAt: string | null;
    bubbleColor?: string;
    isTechMatch?: boolean;
    messageType?: MessageType;
    onPromote?: (id: string, type: MessageType) => void;
    categories?: RoomCategory[];
}

const ICON_MAP: Record<string, any> = {
    Lightbulb, CheckCircle2, Rocket, Sparkles, Target, Zap, Flame, Star, Coffee, Flag
};

const STATIC_STYLES: Record<string, string> = {
    idea: "border-2 border-yellow-400/40 bg-yellow-400/[0.03] shadow-[0_0_25px_rgba(250,204,21,0.15)] backdrop-blur-sm",
    decision: "border-2 border-green-400/40 bg-green-400/[0.03] shadow-[0_0_25px_rgba(74,222,128,0.15)] backdrop-blur-sm",
    action: "border-2 border-purple-400/40 bg-purple-400/[0.03] shadow-[0_0_25px_rgba(192,132,252,0.15)] backdrop-blur-sm",
    sparkles: "border-2 border-indigo-400/40 bg-indigo-400/[0.03] shadow-[0_0_25px_rgba(129,140,248,0.15)] backdrop-blur-sm"
};

const STATIC_ICONS: Record<string, any> = {
    idea: <Lightbulb className="w-4 h-4 text-yellow-500 mr-2 shrink-0" />,
    decision: <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 shrink-0" />,
    action: <Rocket className="w-4 h-4 text-purple-500 mr-2 shrink-0" />,
    sparkles: <Sparkles className="w-4 h-4 text-indigo-500 mr-2 shrink-0" />
};

export const MessageBubble = memo(({
    id,
    content,
    createdAt,
    isMe,
    readAt,
    bubbleColor,
    isTechMatch,
    messageType = 'normal',
    onPromote,
    categories = []
}: MessageBubbleProps) => {
    const formattedTime = useMemo(() => {
        try {
            return format(new Date(createdAt), 'HH:mm');
        } catch (e) {
            return '';
        }
    }, [createdAt]);

    const currentStyle = useMemo(() => {
        if (messageType === 'normal') return "";
        const key = messageType.toLowerCase();
        // Handle mapped types from legacy or exact matches
        if (STATIC_STYLES[key]) return STATIC_STYLES[key];

        // Default style for custom categories
        return "border-2 border-primary/40 bg-primary/5 shadow-[0_0_15px_rgba(var(--primary),0.1)]";
    }, [messageType]);

    const currentIcon = useMemo(() => {
        if (messageType === 'normal') return null;
        const key = messageType.toLowerCase();
        if (STATIC_ICONS[key]) return STATIC_ICONS[key];
        return <Sparkles className="w-4 h-4 text-primary mr-2 shrink-0" />;
    }, [messageType]);

    return (
        <div className={cn("flex w-full mb-4 group animate-in fade-in slide-in-from-bottom-2 duration-500", isMe ? 'justify-end' : 'justify-start')}>
            <div
                className={cn(
                    "max-w-[80%] rounded-2xl p-4 shadow-sm transition-all duration-500 relative overflow-hidden",
                    !isMe && isTechMatch ? "bg-pink-100 dark:bg-pink-900/30 text-pink-900 dark:text-pink-100" :
                        !isMe ? "bg-muted/80 backdrop-blur-sm text-foreground" :
                            "text-primary-foreground",
                    currentStyle
                )}
                style={{
                    backgroundColor: isMe && bubbleColor && messageType === 'normal' ? bubbleColor : undefined,
                    background: isMe && bubbleColor && bubbleColor.includes('grad') && messageType === 'normal' ? bubbleColor : undefined
                }}
            >
                {/* Default primary background if no custom color and isMe and normal */}
                {isMe && !bubbleColor && messageType === 'normal' && (
                    <div className="absolute inset-0 bg-primary -z-10" />
                )}

                <div className="flex items-start relative z-10">
                    {currentIcon}
                    <p className="text-sm sm:text-base break-words font-medium">
                        {content}
                    </p>
                </div>

                <div className={cn(
                    "flex items-center justify-end gap-1 mt-2 text-[10px] relative z-10 opacity-70",
                    isMe ? "text-primary-foreground" : "text-muted-foreground"
                )}>
                    <span>{formattedTime}</span>
                    {isMe && (
                        <span>
                            {readAt ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                        </span>
                    )}
                </div>

                {/* Promote Button (Visible on Hover) */}
                {onPromote && (
                    <div className={cn(
                        "absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0",
                        isMe ? "text-primary-foreground/50" : "text-muted-foreground/50"
                    )}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="p-1 hover:bg-black/10 rounded-full transition-colors">
                                    <MoreHorizontal className="w-4 h-4" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={isMe ? "end" : "start"} className="rounded-2xl border border-gray-100 bg-white shadow-2xl p-2 min-w-[200px]">
                                {categories.map((cat) => {
                                    const IconComp = ICON_MAP[cat.icon] || Sparkles;
                                    return (
                                        <DropdownMenuItem
                                            key={cat.id}
                                            onClick={() => onPromote(id, cat.id)}
                                            className="gap-4 py-3 px-4 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors group/item"
                                        >
                                            <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 group-hover/item:border-primary/20 transition-colors">
                                                <IconComp className="w-4 h-4 text-primary" />
                                            </div>
                                            <span className="font-bold text-[10px] uppercase tracking-widest text-foreground">{cat.name}</span>
                                        </DropdownMenuItem>
                                    );
                                })}

                                {categories.length > 0 && <div className="h-px bg-gray-100 my-2 mx-2" />}

                                <DropdownMenuItem onClick={() => onPromote(id, 'normal')} className="opacity-40 py-3 px-4 text-[9px] font-bold uppercase tracking-widest hover:opacity-100 transition-opacity">
                                    Release to Void
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </div>
        </div>
    );
}, (prev, next) => {
    return (
        prev.content === next.content &&
        prev.readAt === next.readAt &&
        prev.isMe === next.isMe &&
        prev.createdAt === next.createdAt &&
        prev.bubbleColor === next.bubbleColor &&
        prev.isTechMatch === next.isTechMatch &&
        prev.messageType === next.messageType &&
        prev.categories === next.categories
    );
});

MessageBubble.displayName = "MessageBubble";
