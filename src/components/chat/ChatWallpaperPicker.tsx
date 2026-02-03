import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Image as ImageIcon, X, Palette, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const WALLPAPER_PRESETS = [
    { id: 'none', label: 'Default', value: 'transparent' },
    { id: 'blue-gradient', label: 'Soft Blue', value: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)' },
    { id: 'pink-gradient', label: 'Sunset', value: 'linear-gradient(135deg, #fce7f3 0%, #fff1f2 100%)' },
    { id: 'dark-pattern', label: 'Midnight', value: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' },
    { id: 'mesh', label: 'Futora Mesh', value: 'radial-gradient(at 100% 0%, hsla(222,67%,73%,1) 0, transparent 50%), radial-gradient(at 50% 100%, hsla(240,69%,80%,1) 0, transparent 50%)' },
    { id: 'solid-1', label: 'Cloud', value: '#F8FAFC' },
    { id: 'solid-2', label: 'Misty', value: '#F1F5F9' },
    { id: 'solid-3', label: 'Sage', value: '#F0FDF4' },
    { id: 'solid-4', label: 'Amber', value: '#FFFBEB' },
];

const BUBBLE_COLORS = [
    { id: 'default', label: 'Default', value: '' },
    { id: 'blue', label: 'Royal Blue', value: '#3b82f6' },
    { id: 'purple', label: 'Vibrant Purple', value: '#8b5cf6' },
    { id: 'rose', label: 'Rose', value: '#f43f5e' },
    { id: 'emerald', label: 'Emerald', value: '#10b981' },
    { id: 'amber', label: 'Amber', value: '#f59e0b' },
    { id: 'slate', label: 'Slate', value: '#475569' },
    { id: 'indigo-grad', label: 'Indigo Glow', value: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' },
];

interface ChatWallpaperPickerProps {
    isOpen: boolean;
    onClose: () => void;
    currentWallpaper: string;
    onSelectWallpaper: (wallpaper: string) => void;
    currentBubbleColor: string;
    onSelectBubbleColor: (color: string) => void;
}

const ChatWallpaperPicker: React.FC<ChatWallpaperPickerProps> = ({
    isOpen,
    onClose,
    currentWallpaper,
    onSelectWallpaper,
    currentBubbleColor,
    onSelectBubbleColor
}) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-none shadow-2xl bg-background">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                        Chat Appearance
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="wallpaper" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-muted/50 rounded-none h-12">
                        <TabsTrigger value="wallpaper" className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            Wallpaper
                        </TabsTrigger>
                        <TabsTrigger value="bubbles" className="flex items-center gap-2">
                            <Palette className="w-4 h-4" />
                            Bubbles
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="wallpaper" className="p-6 pt-4 m-0">
                        <ScrollArea className="h-[350px] pr-4">
                            <div className="grid grid-cols-2 gap-4">
                                {WALLPAPER_PRESETS.map((preset) => {
                                    const isActive = currentWallpaper === preset.value;
                                    return (
                                        <motion.button
                                            key={preset.id}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => onSelectWallpaper(preset.value)}
                                            className={cn(
                                                "group relative aspect-[4/3] rounded-2xl border-2 transition-all p-1 flex flex-col",
                                                isActive ? "border-primary ring-4 ring-primary/10" : "border-border hover:border-primary/50"
                                            )}
                                        >
                                            <div
                                                className="flex-1 rounded-xl flex items-center justify-center relative overflow-hidden"
                                                style={{
                                                    background: preset.value,
                                                    backgroundColor: preset.value.startsWith('#') ? preset.value : 'transparent'
                                                }}
                                            >
                                                {preset.id === 'none' && <X className="w-8 h-8 text-muted-foreground/30" />}
                                                {isActive && (
                                                    <div className="absolute inset-0 bg-primary/10 flex items-center justify-center backdrop-blur-[1px]">
                                                        <div className="bg-primary text-white rounded-full p-1.5 shadow-lg">
                                                            <Check className="w-4 h-4" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-[10px] font-medium pt-2 text-center group-hover:text-primary transition-colors">
                                                {preset.label}
                                            </span>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="bubbles" className="p-6 pt-4 m-0">
                        <div className="space-y-6">
                            <div className="flex flex-col gap-4">
                                <p className="text-sm font-medium text-muted-foreground px-1">Choose your bubble color</p>
                                <div className="grid grid-cols-4 gap-4">
                                    {BUBBLE_COLORS.map((color) => {
                                        const isActive = currentBubbleColor === color.value;
                                        return (
                                            <motion.button
                                                key={color.id}
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => onSelectBubbleColor(color.value)}
                                                className={cn(
                                                    "w-full aspect-square rounded-full border-2 transition-all relative flex flex-col items-center",
                                                    isActive ? "border-primary ring-4 ring-primary/10" : "border-transparent hover:border-primary/30"
                                                )}
                                            >
                                                <div
                                                    className="w-full h-full rounded-full shadow-inner border border-black/5"
                                                    style={{
                                                        background: color.value || 'var(--primary)',
                                                        backgroundColor: color.value && color.value.startsWith('#') ? color.value : undefined
                                                    }}
                                                />
                                                {isActive && (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <Check className="w-6 h-6 text-white drop-shadow-md" />
                                                    </div>
                                                )}
                                                <span className="text-[10px] absolute -bottom-5 truncate w-full text-center">
                                                    {color.label}
                                                </span>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="mt-8 p-4 bg-muted/30 rounded-2xl border border-border/50">
                                <p className="text-xs text-muted-foreground text-center italic">
                                    "Your bubbles represent your identity. Choose a color that fits your mood today."
                                </p>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="p-4 bg-muted/50 border-t border-border flex justify-end">
                    <Button onClick={onClose} className="gradient-primary px-8 rounded-full">
                        Done
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ChatWallpaperPicker;
