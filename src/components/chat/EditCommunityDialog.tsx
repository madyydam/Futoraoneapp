import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Users, Globe, Lock, Upload, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import imageCompression from 'browser-image-compression';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Community {
    id: string;
    name: string;
    tagline: string;
    description: string;
    avatar_url: string | null;
    category: string;
    is_public: boolean;
}

interface EditCommunityDialogProps {
    community: Community;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCommunityUpdated?: () => void;
}

const CATEGORIES = [
    "For Students",
    "For Techies",
    "For Designers",
    "For Entrepreneurs",
    "General"
];

export function EditCommunityDialog({ community, open, onOpenChange, onCommunityUpdated }: EditCommunityDialogProps) {
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState(community.name);
    const [tagline, setTagline] = useState(community.tagline || "");
    const [description, setDescription] = useState(community.description || "");
    const [category, setCategory] = useState(community.category || "General");
    const [isPublic, setIsPublic] = useState(community.is_public);
    const [iconFile, setIconFile] = useState<File | null>(null);
    const [iconPreview, setIconPreview] = useState<string | null>(community.avatar_url);

    useEffect(() => {
        if (open) {
            setName(community.name);
            setTagline(community.tagline || "");
            setDescription(community.description || "");
            setCategory(community.category || "General");
            setIsPublic(community.is_public);
            setIconPreview(community.avatar_url);
            setIconFile(null);
        }
    }, [open, community]);

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

            let avatarUrl = community.avatar_url;
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
                const fileName = `${user.id}/community_${Date.now()}.${fileExt}`;

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
                .from('communities')
                .update({
                    name,
                    tagline,
                    description,
                    avatar_url: avatarUrl,
                    category,
                    is_public: isPublic,
                    updated_at: new Date().toISOString()
                })
                .eq('id', community.id);

            if (error) throw error;

            toast.success("Community updated successfully!");
            onOpenChange(false);
            onCommunityUpdated?.();
        } catch (error) {
            console.error('Error updating community:', error);
            toast.error("Failed to update community");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Users className="w-5 h-5 text-primary" />
                        Edit Community
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-5 pt-4">
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
                            <Label htmlFor="name" className="text-sm font-semibold">Community Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="bg-muted/30"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="tagline" className="text-sm font-semibold">Tagline</Label>
                            <Input
                                id="tagline"
                                value={tagline}
                                onChange={(e) => setTagline(e.target.value)}
                                className="bg-muted/30"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="resize-none h-24 bg-muted/30"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category" className="text-sm font-semibold">Category</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger className="bg-muted/30">
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
                            <div className="flex items-center gap-3">
                                {isPublic ? <Globe className="w-5 h-5 text-primary" /> : <Lock className="w-5 h-5 text-muted-foreground" />}
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-semibold">Public (Anyone can join)</Label>
                                    <p className="text-[10px] text-muted-foreground">Members can find and join easily</p>
                                </div>
                            </div>
                            <Switch
                                checked={isPublic}
                                onCheckedChange={setIsPublic}
                                className="data-[state=checked]:bg-primary"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="flex-1">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="flex-1 bg-primary hover:bg-primary/90 text-white shadow-sm font-bold">
                            {loading ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
