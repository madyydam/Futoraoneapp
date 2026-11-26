import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Users, Globe, Lock, Hash, Tag, ImageIcon, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import imageCompression from 'browser-image-compression';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CreateCommunityDialogProps {
    onCommunityCreated?: () => void;
    trigger?: React.ReactNode;
}

const CATEGORIES = [
    "For Students",
    "For Techies",
    "For Designers",
    "For Entrepreneurs",
    "General"
];

export function CreateCommunityDialog({ onCommunityCreated, trigger }: CreateCommunityDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [tagline, setTagline] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("General");
    const [isPublic, setIsPublic] = useState(true);
    const [iconFile, setIconFile] = useState<File | null>(null);
    const [iconPreview, setIconPreview] = useState<string | null>(null);

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
        let uploadedPath: string | null = null;
        let createdCommunityId: string | null = null;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // 1. Upload Icon if selected
            let avatarUrl = null;
            if (iconFile) {
                const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
                if (!allowedTypes.includes(iconFile.type) || iconFile.size > 5 * 1024 * 1024) {
                    toast.error("Please select a valid image under 5 MB");
                    setLoading(false);
                    return;
                }

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
                    .from('community-avatars')
                    .upload(fileName, compressedFile, {
                        upsert: true,
                        contentType: compressedFile.type
                    });

                if (uploadError) throw uploadError;
                uploadedPath = fileName;

                const { data: { publicUrl } } = supabase.storage
                    .from('community-avatars')
                    .getPublicUrl(fileName);

                avatarUrl = publicUrl;
            }

            // 2. Create Community
            const { data: community, error: communityError } = await supabase
                .from('communities' as any)
                .insert({
                    name,
                    tagline,
                    description,
                    avatar_url: avatarUrl,
                    category,
                    is_public: isPublic,
                    created_by: user.id
                })
                .select()
                .single();

            if (communityError) throw communityError;

            const communityId = (community as any).id;
            createdCommunityId = communityId;

            // 2. Add Creator as Admin
            const { error: memberError } = await supabase
                .from('community_members' as any)
                .insert({
                    community_id: communityId,
                    user_id: user.id,
                    role: 'admin'
                });

            if (memberError) throw memberError;

            // 3. Create default channels: #announcements, #discussions
            const { error: channelsError } = await supabase
                .from('community_channels' as any)
                .insert([
                    { community_id: communityId, name: 'announcements', description: 'Major updates and news' },
                    { community_id: communityId, name: 'discussions', description: 'General talk and networking' }
                ]);

            if (channelsError) throw channelsError;

            toast.success("Community created successfully!");
            setOpen(false);
            onCommunityCreated?.();

            // Reset form
            setName("");
            setTagline("");
            setDescription("");
            setCategory("General");
            setIconFile(null);
            setIconPreview(null);
        } catch (error) {
            if (createdCommunityId) {
                await supabase.from('communities' as any).delete().eq('id', createdCommunityId);
            }
            if (uploadedPath) {
                await supabase.storage.from('community-avatars').remove([uploadedPath]);
            }
            console.error('Error creating community:', error);
            toast.error("Failed to create community");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-md">
                        <Plus className="h-4 w-4" />
                        Create Community
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Users className="w-5 h-5 text-primary" />
                        Create Community
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-5 pt-4">
                    <div className="space-y-4">
                        {/* Icon Upload Section */}
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
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Community Icon</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-sm font-semibold">Community Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g. My Study Group"
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
                                placeholder="Short, catchy phrase"
                                value={tagline}
                                onChange={(e) => setTagline(e.target.value)}
                                className="bg-muted/30"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Tell us about your community..."
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
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="flex-1">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="flex-1 bg-primary hover:bg-primary/90 text-white shadow-sm font-bold">
                            {loading ? "Creating..." : "Create Community"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
