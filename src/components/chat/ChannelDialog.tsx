import React, { useState, useEffect } from "react";
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
import { Hash, Lock, Globe, MessageSquare, Info, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
    AlertDialog, AlertDialogTrigger, AlertDialogContent,
    AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
    AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";

export interface ChannelDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    communityId: string;
    channel?: { id: string; name: string; description?: string }; // If provided, we are in edit mode
    onSuccess: () => void;
}

export function ChannelDialog({ open, onOpenChange, communityId, channel, onSuccess }: ChannelDialogProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [showDeleteAlert, setShowDeleteAlert] = useState(false);

    const isEdit = !!channel;

    useEffect(() => {
        if (open) {
            setName(channel?.name || "");
            setDescription(channel?.description || "");
        }
    }, [open, channel]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            const channelName = name.trim().toLowerCase().replace(/\s+/g, '-');

            if (isEdit) {
                const { error } = await supabase
                    .from("community_channels" as any)
                    .update({
                        name: channelName,
                        description: description.trim(),
                    })
                    .eq("id", channel.id);
                if (error) throw error;
                toast.success(`Channel updated! 🛠️`);
            } else {
                const { error } = await supabase
                    .from("community_channels" as any)
                    .insert({
                        community_id: communityId,
                        name: channelName,
                        description: description.trim(),
                    });
                if (error) throw error;
                toast.success(`Channel #${name} created! 🚀`);
            }

            setName("");
            setDescription("");
            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            console.error("Channel operation error:", err);
            toast.error(err.message || `Failed to ${isEdit ? 'update' : 'create'} channel`);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!channel) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from("community_channels" as any)
                .delete()
                .eq("id", channel.id);
            if (error) throw error;

            toast.success(`Channel #${channel.name} deleted.`);
            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            console.error("Delete channel error:", err);
            toast.error(err.message || "Failed to delete channel");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-[400px] rounded-[24px] border-border/40 bg-card overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Hash className="w-32 h-32" />
                    </div>

                    <DialogHeader className="relative z-10">
                        <DialogTitle className="text-2xl font-black tracking-tighter">
                            {isEdit ? "Edit Channel" : "Create Channel"}
                        </DialogTitle>
                        <DialogDescription className="font-medium text-muted-foreground/60">
                            {isEdit ? `Modifying #${channel.name}` : "Give your squad a place to talk about specific topics."}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 relative z-10 py-2">
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

                        {isEdit && (
                            <div className="pt-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl font-bold text-xs gap-2"
                                    onClick={() => setShowDeleteAlert(true)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete Channel
                                </Button>
                            </div>
                        )}

                        {!isEdit && (
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 text-[11px] text-blue-600 dark:text-blue-400 font-medium leading-relaxed">
                                <Info className="w-4 h-4 flex-shrink-0" />
                                <p>Channels are public to all community members by default.</p>
                            </div>
                        )}

                        <DialogFooter className="pt-2 gap-2">
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
                                {loading ? "Saving..." : (isEdit ? "Update Room" : "Create Squad Room")}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
                <AlertDialogContent className="rounded-[24px] max-w-[340px] border-border/40">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-black text-xl tracking-tighter">Delete Channel?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium">
                            Are you sure you want to delete <span className="text-foreground font-black">#{channel?.name}</span>?
                            This action is permanent and will remove all messages in this channel.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="rounded-xl border-border/40 font-bold">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="rounded-xl bg-destructive hover:bg-destructive/90 font-black h-11"
                            onClick={handleDelete}
                        >
                            Delete Channel
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
