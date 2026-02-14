import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Users, Globe, Lock, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import imageCompression from 'browser-image-compression';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Group {
    id: string;
    name: string;
    description: string;
    avatar_url: string | null;
    is_public: boolean;
}

interface EditGroupDialogProps {
    group: Group;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onGroupUpdated?: () => void;
}

export function EditGroupDialog({ group, open, onOpenChange, onGroupUpdated }: EditGroupDialogProps) {
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState(group.name);
    const [description, setDescription] = useState(group.description || "");
    const [isPublic, setIsPublic] = useState(group.is_public);
    const [iconFile, setIconFile] = useState<File | null>(null);
    const [iconPreview, setIconPreview] = useState<string | null>(group.avatar_url);

    useEffect(() => {
        if (open) {
            setName(group.name);
            setDescription(group.description || "");
            setIsPublic(group.is_public);
            setIconPreview(group.avatar_url);
            setIconFile(null);
        }
    }, [open, group]);

    const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIconFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setIconPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            let avatarUrl = group.avatar_url;
            if (iconFile) {
                const options = {
                    maxSizeMB: 0.5,
                    maxWidthOrHeight: 500,
                    useWebWorker: true,
                };

                let compressedFile = iconFile;
                try {
                    compressedFile = await imageCompression(iconFile, options);
                } catch (error) {
                    console.error("Icon compression failed:", error);
                }

                const fileExt = compressedFile.name.split('.').pop();
                const fileName = `${user.id}/group_${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('post_images')
                    .upload(fileName, compressedFile, {
                        upsert: true,
                        contentType: compressedFile.type
                    });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('post_images')
                    .getPublicUrl(fileName);

                avatarUrl = publicUrl;
            }

            const { error } = await supabase
                .from('groups' as any)
                .update({
                    name,
                    description,
                    avatar_url: avatarUrl,
                    is_public: isPublic,
                    updated_at: new Date().toISOString()
                })
                .eq('id', group.id);

            if (error) throw error;

            toast.success("Group updated successfully!");
            onOpenChange(false);
            onGroupUpdated?.();
        } catch (error) {
            console.error('Error updating group:', error);
            toast.error("Failed to update group");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        Edit Group Details
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="space-y-4">
                        <div className="flex flex-col items-center gap-4 py-2">
                            <div className="relative group">
                                <Avatar className="h-20 w-20 border-2 border-primary/20 shadow-xl">
                                    <AvatarImage src={iconPreview || undefined} className="object-cover" />
                                    <AvatarFallback className="bg-primary/10 text-primary">
                                        <Users className="h-8 w-8 opacity-40" />
                                    </AvatarFallback>
                                </Avatar>
                                <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                    <Upload className="h-5 w-5" />
                                    <input type="file" accept="image/*" className="hidden" onChange={handleIconChange} />
                                </label>
                            </div>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Change Icon</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Group Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
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
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading} className="min-w-[100px]">
                            {loading ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
