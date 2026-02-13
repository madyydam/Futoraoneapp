import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Users, Globe, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast as sonnerToast } from "sonner";

interface CreateGroupDialogProps {
    onGroupCreated?: () => void;
    trigger?: React.ReactNode;
}

export function CreateGroupDialog({ onGroupCreated, trigger }: CreateGroupDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isPublic, setIsPublic] = useState(true);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // 1. Create Group
            const { data: group, error: groupError } = await supabase
                .from('groups' as any)
                .insert({
                    name,
                    description,
                    is_public: isPublic,
                    created_by: user.id
                })
                .select()
                .single();

            if (groupError) throw groupError;
            const groupId = (group as any).id;

            // 2. Add Creator as Admin
            const { error: memberError } = await supabase
                .from('group_members' as any)
                .insert({
                    group_id: groupId,
                    user_id: user.id,
                    role: 'admin'
                });

            if (memberError) throw memberError;

            sonnerToast.success("Group created successfully!");
            setOpen(false);
            onGroupCreated?.();
            setName("");
            setDescription("");
        } catch (error) {
            console.error('Error creating group:', error);
            sonnerToast.error("Failed to create group");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Create Group
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        Create New Group
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Group Name</Label>
                            <Input
                                id="name"
                                placeholder="Enter group name..."
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea
                                id="description"
                                placeholder="What's this group about?"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="resize-none h-24"
                            />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                            <div className="flex items-center gap-3">
                                {isPublic ? <Globe className="w-4 h-4 text-primary" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
                                <div className="space-y-0.5">
                                    <Label className="text-sm">Public Group</Label>
                                    <p className="text-[10px] text-muted-foreground">Anyone can see and join this group</p>
                                </div>
                            </div>
                            <Switch
                                checked={isPublic}
                                onCheckedChange={setIsPublic}
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 justify-end">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading} className="min-w-[100px]">
                            {loading ? "Creating..." : "Create Group"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
