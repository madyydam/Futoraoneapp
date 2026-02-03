import React, { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Lightbulb, CheckCircle2, Rocket, Sparkles, X, BrainCircuit,
    Target, Zap, Flame, Star, Coffee, Flag, Plus
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRoomCategories } from '@/hooks/useRoomCategories';
import { useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { InsightCard } from './InsightCard';

interface Message {
    id: string;
    content: string;
    message_type?: string;
}

interface RoomIntelligenceProps {
    isOpen: boolean;
    onClose: () => void;
    messages: Message[];
}

const ICON_MAP: Record<string, any> = {
    Lightbulb, CheckCircle2, Rocket, Sparkles, Target, Zap, Flame, Star, Coffee, Flag
};

export const RoomIntelligence: React.FC<RoomIntelligenceProps> = ({ isOpen, onClose, messages }) => {
    const { conversationId } = useParams();
    const { categories, addCategory, deleteCategory, updateCategory, loading } = useRoomCategories(conversationId);
    const [isAdding, setIsAdding] = useState(false);
    const [newCatName, setNewCatName] = useState("");
    const [newCatIcon, setNewCatIcon] = useState("Sparkles");
    const [editingId, setEditingId] = useState<string | null>(null);

    // Optimization: Group messages by type once using useMemo
    const messagesByType = useMemo(() => {
        const grouped: Record<string, Message[]> = {};
        messages.forEach(m => {
            if (m.message_type && m.message_type !== 'normal') {
                if (!grouped[m.message_type]) grouped[m.message_type] = [];
                grouped[m.message_type].push(m);
            }
        });
        return grouped;
    }, [messages]);

    const totalIntelligence = useMemo(() =>
        Object.values(messagesByType).reduce((acc, curr) => acc + curr.length, 0),
        [messagesByType]);

    const getDynamicMicrocopy = useCallback(() => {
        if (loading) return "Syncing...";
        if (totalIntelligence === 0) return "Nothing here yet";
        return "Records updated";
    }, [loading, totalIntelligence]);

    const handleAdd = async () => {
        if (!newCatName.trim()) return;
        await addCategory(newCatName.trim(), newCatIcon);
        setNewCatName("");
        setNewCatIcon("Sparkles");
        setIsAdding(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-12">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-white"
                    />

                    <motion.div
                        initial={{ scale: 0.98, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.98, opacity: 0 }}
                        className="relative w-full h-full md:h-[90vh] md:w-[600px] md:rounded-[2rem] overflow-hidden bg-white border border-border shadow-2xl flex flex-col mx-auto"
                    >
                        <div className="p-6 pb-4 relative z-10 flex items-center justify-between border-b border-border">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/5 rounded-2xl">
                                    <BrainCircuit className="w-8 h-8 text-primary" />
                                </div>
                                <div className="space-y-0.5">
                                    <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
                                        Memory
                                    </h2>
                                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{getDynamicMicrocopy()}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    onClick={() => setIsAdding(true)}
                                    className="rounded-xl gradient-primary font-bold uppercase tracking-wider text-[10px]"
                                >
                                    <Plus className="w-3.5 h-3.5 mr-1.5" /> New Category
                                </Button>
                                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-10 w-10 text-muted-foreground hover:text-foreground">
                                    <X className="w-6 h-6" />
                                </Button>
                            </div>
                        </div>

                        <AnimatePresence>
                            {isAdding && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="px-4 py-3 bg-white border-b border-gray-100 overflow-hidden"
                                >
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center gap-2">
                                            <Input
                                                autoFocus
                                                placeholder="REALM NAME..."
                                                value={newCatName}
                                                onChange={e => setNewCatName(e.target.value)}
                                                className="flex-1 bg-background h-10 px-4 rounded-xl font-bold text-sm"
                                                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                                            />
                                            <Button onClick={handleAdd} size="sm" className="rounded-xl gradient-primary font-bold">Add</Button>
                                            <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)} className="rounded-xl font-bold text-muted-foreground">X</Button>
                                        </div>
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            {Object.entries(ICON_MAP).map(([name, Icon]) => (
                                                <Button
                                                    key={name}
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setNewCatIcon(name)}
                                                    className={cn(
                                                        "h-8 w-8 rounded-lg",
                                                        newCatIcon === name ? "bg-primary/10 text-primary" : "text-muted-foreground/30 hover:text-foreground"
                                                    )}
                                                >
                                                    <Icon className="w-4 h-4" />
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <ScrollArea className="flex-1 px-6 relative z-10 hide-scrollbar">
                            <div className="flex flex-col gap-4 py-6">
                                {categories.map((cat) => (
                                    <InsightCard
                                        key={cat.id}
                                        category={cat}
                                        items={messagesByType[cat.id] || []}
                                        onDelete={() => deleteCategory(cat.id)}
                                        isEditing={editingId === cat.id}
                                        onEditStart={() => setEditingId(cat.id)}
                                        onEditSave={async (newName, newIcon) => {
                                            await updateCategory(cat.id, { name: newName, icon: newIcon });
                                            setEditingId(null);
                                        }}
                                        onEditCancel={() => setEditingId(null)}
                                    />
                                ))}
                            </div>
                        </ScrollArea>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
