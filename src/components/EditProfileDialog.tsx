import React, { useState, useEffect, useCallback, memo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Image as ImageIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import imageCompression from 'browser-image-compression';
import { useNavigate } from "react-router-dom";

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  portfolio_url: string | null;
  tech_skills: string[] | null;
  banner_url: string | null;
  digest_mode?: boolean;
}

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
  userId: string;
  onUpdate: () => void;
}

const EditProfileDialogComponent = ({ open, onOpenChange, profile, userId, onUpdate }: EditProfileDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || "",
    username: profile?.username || "",
    bio: profile?.bio || "",
    location: profile?.location || "Pune",
    github_url: profile?.github_url || "",
    linkedin_url: profile?.linkedin_url || "",
    instagram_url: profile?.instagram_url || "",
    portfolio_url: profile?.portfolio_url || "",
    tech_skills: profile?.tech_skills?.join(", ") || "",
    digest_mode: profile?.digest_mode || false,
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let avatarUrl = profile?.avatar_url;

      // Upload avatar file if changed
      if (avatarFile) {
        const options = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 500,
          useWebWorker: true,
        };

        let compressedFile = avatarFile;
        try {
          compressedFile = await imageCompression(avatarFile, options);
        } catch (error) {
          console.error("Avatar compression failed:", error);
        }

        const fileExt = compressedFile.name.split('.').pop();
        // Standardized path: bucket/[userId]/[filename]
        const fileName = `${user.id}/avatar_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('post_images')
          .upload(fileName, compressedFile, {
            upsert: true,
            contentType: compressedFile.type
          });

        if (uploadError) {
          console.error('Avatar upload error:', uploadError);
          throw new Error(`Avatar upload failed: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('post_images')
          .getPublicUrl(fileName);

        avatarUrl = publicUrl;
      }

      let bannerUrl = profile?.banner_url;

      // Upload banner if changed
      if (bannerFile) {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1500,
          useWebWorker: true,
        };

        let compressedFile = bannerFile;
        try {
          compressedFile = await imageCompression(bannerFile, options);
        } catch (error) {
          console.error("Banner compression failed:", error);
        }

        const fileExt = compressedFile.name.split('.').pop();
        const fileName = `${user.id}/banner_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('post_images')
          .upload(fileName, compressedFile, {
            upsert: true,
            contentType: compressedFile.type
          });

        if (uploadError) {
          console.error('Banner upload error:', uploadError);
          throw new Error(`Banner upload failed: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('post_images')
          .getPublicUrl(fileName);

        bannerUrl = publicUrl;
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: formData.full_name,
          username: formData.username,
          bio: formData.bio,
          location: formData.location,
          github_url: formData.github_url,
          linkedin_url: formData.linkedin_url,
          instagram_url: formData.instagram_url,
          portfolio_url: formData.portfolio_url,
          tech_skills: formData.tech_skills.split(',').map(s => s.trim()).filter(Boolean),
          avatar_url: avatarUrl,
          banner_url: bannerUrl,
          digest_mode: formData.digest_mode,
        });

      if (error) throw error;

      toast({
        title: "Profile updated!",
        description: "Your profile has been updated successfully.",
      });

      onUpdate();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [profile, avatarFile, bannerFile, formData, onUpdate, onOpenChange, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Profile Picture</Label>
              <div className="flex items-center gap-3">
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-muted">
                  {avatarFile ? (
                    <img
                      src={URL.createObjectURL(avatarFile)}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={profile?.avatar_url || "/placeholder.svg"}
                      alt="Current avatar"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      onOpenChange(false);
                      navigate('/select-avatar');
                    }}
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Choose Cartoon Avatar
                  </Button>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                    className="cursor-pointer text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    Choose avatar or upload custom photo (max 2MB)
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Banner Image</Label>
              <div className="space-y-3">
                <div className="relative w-full h-32 rounded-lg overflow-hidden border-2 border-muted bg-muted/30">
                  {bannerFile ? (
                    <img
                      src={URL.createObjectURL(bannerFile)}
                      alt="Banner preview"
                      className="w-full h-full object-cover"
                    />
                  ) : profile?.banner_url ? (
                    <img
                      src={profile.banner_url}
                      alt="Current banner"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <span className="text-sm">No banner set</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                    className="cursor-pointer"
                  />
                  <Upload className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Recommended: 1500x500px, max 5MB
                </p>
              </div>
            </div>
          </div >

          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell us about yourself..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location || "Pune"}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Pune"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tech_skills">Tech Skills (comma-separated)</Label>
            <Input
              id="tech_skills"
              value={formData.tech_skills}
              onChange={(e) => setFormData({ ...formData, tech_skills: e.target.value })}
              placeholder="e.g., React, TypeScript, Node.js"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="github_url">GitHub URL</Label>
            <Input
              id="github_url"
              type="url"
              value={formData.github_url}
              onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
              placeholder="https://github.com/username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin_url">LinkedIn URL</Label>
            <Input
              id="linkedin_url"
              type="url"
              value={formData.linkedin_url}
              onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
              placeholder="https://linkedin.com/in/username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instagram_url">Instagram URL</Label>
            <Input
              id="instagram_url"
              type="url"
              value={formData.instagram_url}
              onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
              placeholder="https://instagram.com/username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="portfolio_url">Portfolio URL</Label>
            <Input
              id="portfolio_url"
              type="url"
              value={formData.portfolio_url}
              onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
              placeholder="https://yourwebsite.com"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Daily Digest</Label>
              <p className="text-sm text-muted-foreground">
                Receive a single daily notification instead of immediate alerts.
              </p>
            </div>
            <Switch
              checked={formData.digest_mode}
              onCheckedChange={(checked) => setFormData({ ...formData, digest_mode: checked })}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full gradient-primary text-white">
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </form >
      </DialogContent >
    </Dialog >
  );
};

export const EditProfileDialog = memo(EditProfileDialogComponent);
