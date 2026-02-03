import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    X, Sparkles, Trash2, Edit2, Check
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RoomCategory } from '@/hooks/useRoomCategories';

const ICON_MAP: Record<string, any> = {
    // These should ideally be imported or passed down, but for now we'll define them here or use common ones
    // In RoomIntelligence they were defined locally. I'll pass them or re-define common ones.
};

// Re-defining for isolation, or better yet, import from RoomIntelligence if we export them
import { Lightbulb, CheckCircle2, Rocket, Target, Zap, Flame, Star, Coffee, Flag } from 'lucide-react';

const SHARED_ICON_MAP: Record<string, any> = {
    Lightbulb, CheckCircle2, Rocket, Sparkles, Target, Zap, Flame, Star, Coffee, Flag
};

const COLOR_MAP: Record<string, string> = {
    yellow: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    green: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    purple: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    rose: "text-rose-500 bg-rose-500/10 border-rose-500/20",
    orange: "text-orange-500 bg-orange-500/10 border-orange-500/20"
};

interface InsightCardProps {
    category: RoomCategory;
    items: any[];
    onDelete: () => void;
    isEditing: boolean;
    onEditStart: () => void;
    onEditSave: (name: string, icon: string) => void;
    onEditCancel: () => void;
}

export const InsightCard: React.FC<InsightCardProps> = ({ category, items, onDelete, isEditing, onEditStart, onEditSave, onEditCancel }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [editValue, setEditValue] = useState(category.name);
    const [editIcon, setEditIcon] = useState(category.icon);

    useEffect(() => {
        if (isEditing) {
            setEditValue(category.name);
            setEditIcon(category.icon);
        }
    }, [isEditing, category.name, category.icon]);

    const IconComp = SHARED_ICON_MAP[category.icon] || Sparkles;
    const colorStyles = COLOR_MAP[category.color] || COLOR_MAP.purple;

    return (
        <motion.div
            layout
            className="group relative flex flex-col bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-primary/20 transition-all shadow-sm"
        >
            <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={cn("p-2.5 rounded-xl border-none shadow-sm", colorStyles)}>
                            <IconComp className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            {isEditing ? (
                                <div className="flex flex-col gap-2 w-full">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            autoFocus
                                            value={editValue}
                                            onChange={e => setEditValue(e.target.value)}
                                            className="h-8 font-bold uppercase tracking-wide text-xs bg-white rounded-lg px-2 border-gray-200"
                                        />
                                        <div className="flex items-center gap-1">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-500" onClick={() => onEditSave(editValue, editIcon)}>
                                                <Check className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500" onClick={onEditCancel}>
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {Object.entries(SHARED_ICON_MAP).map(([name, Icon]) => (
                                            <button
                                                key={name}
                                                type="button"
                                                onClick={() => setEditIcon(name)}
                                                className={cn(
                                                    "h-7 w-7 flex items-center justify-center rounded-md transition-all",
                                                    editIcon === name ? "bg-primary/10 text-primary" : "opacity-30 hover:opacity-100"
                                                )}
                                            >
                                                <Icon className="w-3.5 h-3.5" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <h4 className="text-sm font-bold uppercase tracking-tight text-foreground italic truncate">{category.name}</h4>
                                    <p className="text-[9px] text-muted-foreground/60 font-bold uppercase tracking-wider">
                                        {items.length} Signals
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {!isEditing && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <Button variant="ghost" size="icon" onClick={onEditStart} className="h-7 w-7 rounded-lg hover:bg-primary/10">
                                <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={onDelete} className="h-7 w-7 rounded-lg hover:bg-rose-500/10 hover:text-rose-500">
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    )}
                </div>

                <div className="space-y-2 flex-1">
                    {items.length === 0 ? (
                        <div className="py-6 flex flex-col items-center justify-center border border-dashed rounded-[1rem] border-gray-100 bg-white">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/30 text-center">
                                Void
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            {(isExpanded ? items : items.slice(0, 3)).map((m) => (
                                <div
                                    key={m.id}
                                    className="p-3 rounded-xl border border-border bg-white text-[12px] font-medium leading-tight shadow-sm"
                                >
                                    <div className="flex items-start gap-2">
                                        <div className={cn("w-1 h-3 rounded-full mt-0.5", colorStyles.split(' ')[0])} />
                                        <span className="flex-1 opacity-80 text-xs">{m.content}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {items.length > 3 && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-full text-center pt-3 mt-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 hover:text-primary transition-all"
                    >
                        {isExpanded ? "Less" : `${items.length - 3} More`}
                    </button>
                )}
            </div>
        </motion.div>
    );
};
