import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Hash, Lock, Globe, MessageSquare, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CreateChannelDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    communityId: string;
    onSuccess: () => void;
}

export function CreateChannelDialog({ open, onOpenChange, communityId, onSuccess }: CreateChannelDialogProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from("community_channels" as any)
                .insert({
                    community_id: communityId,
                    name: name.trim().toLowerCase().replace(/\s+/g, '-'),
                    description: description.trim(),
                });

            if (error) throw error;

            toast.success(`Channel #${name} created! 🚀`);
            setName("");
            setDescription("");
            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            console.error("Create channel error:", err);
            toast.error(err.message || "Failed to create channel");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[400px] rounded-[24px] border-border/40 bg-card overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Hash className="w-32 h-32" />
                </div>

                <DialogHeader className="relative z-10">
                    <DialogTitle className="text-2xl font-black tracking-tighter">Create Channel</DialogTitle>
                    <DialogDescription className="font-medium text-muted-foreground/60">
                        Give your squad a place to talk about specific topics.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreate} className="space-y-4 relative z-10 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="channel-name" className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/40 px-1">
                            Channel Name
                        </Label>
                        <div className="relative group">
                            <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                            <Input
                                id="channel-name"
                                placeholder="new-vibe"
                                value={name}
                                onChange={(e) => setName(e.target.value.toLowerCase())}
                                className="pl-10 h-12 bg-muted/30 border-border/20 rounded-xl font-bold focus-visible:ring-primary/20 focus-visible:bg-card transition-all"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/40 px-1">
                            Topic / Description
                        </Label>
                        <div className="relative">
                            <Textarea
                                id="description"
                                placeholder="What's this channel about?"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="min-h-[80px] bg-muted/30 border-border/20 rounded-xl font-medium focus-visible:ring-primary/20 focus-visible:bg-card transition-all resize-none p-3"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 text-[11px] text-blue-600 dark:text-blue-400 font-medium leading-relaxed">
                        <Info className="w-4 h-4 flex-shrink-0" />
                        <p>Channels are public to all community members by default. You can restrict access later in settings.</p>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="rounded-xl font-bold h-11"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!name.trim() || loading}
                            className="rounded-xl bg-primary hover:bg-primary/90 text-white font-black px-8 h-11 shadow-lg shadow-primary/20 transition-all active:scale-95"
                        >
                            {loading ? "Creating..." : "Create Squad Room"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
