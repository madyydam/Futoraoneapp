import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, Smile, Flame, Rocket, Coffee, Heart, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const MOODS = [
    { id: 'chill', emoji: '😎', label: 'Chill' },
    { id: 'hustle', emoji: '🚀', label: 'Hustle' },
    { id: 'creative', emoji: '🎨', label: 'Creative' },
    { id: 'coffee', emoji: '☕', label: 'Fueled' },
    { id: 'curious', emoji: '🧐', label: 'Curious' },
    { id: 'love', emoji: '❤️', label: 'Love' },
    { id: 'builder', emoji: '🛠️', label: 'Builder' },
    { id: 'lit', emoji: '🔥', label: 'Lit' },
];

const PRESET_COLORS = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Amber
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#F97316', // Orange
];

interface VibeSelectorProps {
    initialVibe: {
        mood?: string;
        color?: string;
        status?: string;
    };
    onSave: (vibe: { mood: string; color: string; status: string }) => void;
}

export const VibeSelector = ({ initialVibe, onSave }: VibeSelectorProps) => {
    const [selectedMood, setSelectedMood] = useState(initialVibe.mood || '😎');
    const [selectedColor, setSelectedColor] = useState(initialVibe.color || '#3B82F6');
    const [status, setStatus] = useState(initialVibe.status || '');

    return (
        <div className="space-y-6 py-4">
            {/* Mood Selection */}
            <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                    <Smile className="w-4 h-4" />
                    How's the vibe today?
                </Label>
                <div className="grid grid-cols-4 gap-2">
                    {MOODS.map((m) => (
                        <motion.button
                            key={m.id}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedMood(m.emoji)}
                            className={cn(
                                "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all",
                                selectedMood === m.emoji
                                    ? "border-primary bg-primary/5 shadow-md"
                                    : "border-border hover:border-primary/50"
                            )}
                        >
                            <span className="text-2xl mb-1">{m.emoji}</span>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">{m.label}</span>
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Color Selection */}
            <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Signature Color
                </Label>
                <div className="flex flex-wrap gap-3 mt-1">
                    {PRESET_COLORS.map((c) => (
                        <button
                            key={c}
                            onClick={() => setSelectedColor(c)}
                            className={cn(
                                "w-10 h-10 rounded-full border-2 transition-all relative flex items-center justify-center",
                                selectedColor === c ? "border-foreground scale-110 shadow-lg" : "border-transparent hover:scale-105"
                            )}
                            style={{ backgroundColor: c }}
                        >
                            {selectedColor === c && <Check className="w-5 h-5 text-white drop-shadow-md" />}
                        </button>
                    ))}
                    <div className="relative group">
                        <Input
                            type="color"
                            value={selectedColor}
                            onChange={(e) => setSelectedColor(e.target.value)}
                            className="w-10 h-10 p-0 rounded-full border-none cursor-pointer overflow-hidden"
                        />
                    </div>
                </div>
            </div>

            {/* Status input */}
            <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Status (Snap-style)
                </Label>
                <Input
                    placeholder="Wagwan? Add a status..."
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    maxLength={50}
                    className="bg-muted/50 border-none focus-visible:ring-primary h-12 text-lg"
                />
                <p className="text-[10px] text-right text-muted-foreground">{status.length}/50</p>
            </div>

            <Button
                onClick={() => onSave({ mood: selectedMood, color: selectedColor, status })}
                className="w-full h-12 text-lg gradient-primary rounded-xl"
            >
                Lock My Vibe 🚀
            </Button>
        </div>
    );
};
