import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Image as ImageIcon, X, Video } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import imageCompression from 'browser-image-compression';
import { useDraftPost } from "@/hooks/useDraftPost";

const CreatePost = () => {
  const [user, setUser] = useState<User | null>(null);
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [tags, setTags] = useState("");
  const [postType, setPostType] = useState<"post" | "project_update">("post");
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { draft, saveDraft, clearDraft } = useDraftPost();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchProjects();
      const editId = searchParams.get("edit");
      if (editId) {
        fetchPostForEdit(editId);
      } else if (draft && !content) {
        // Restore draft if not editing
        setContent(draft);
        toast({
          title: "Draft restored",
          description: "Your previous draft has been restored.",
        });
      }
    }
  }, [user, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProjects = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('projects')
      .select('id, title')
      .eq('user_id', user.id);
    setProjects(data || []);
  };

  const fetchPostForEdit = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (error) throw error;
      if (data.user_id !== user?.id) {
        toast({
          title: "Error",
          description: "You can only edit your own posts",
          variant: "destructive",
        });
        navigate("/feed");
        return;
      }

      setEditingPostId(postId);
      setContent(data.content);
      if (data.image_url) setImagePreview(data.image_url);
      setPostType(data.is_project_update ? "project_update" : "post");
      if (data.project_id) setSelectedProject(data.project_id);
      clearDraft(); // Clear draft when editing existing post
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setVideoFile(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !content.trim()) return;

    setLoading(true);

    try {
      // AI Content Moderation Check
      const { data: moderationData, error: moderationError } = await supabase.functions.invoke('moderate-content', {
        body: { content: content.trim() }
      });

      if (moderationError) {
        console.error("Moderation error:", moderationError);
        // We continue if moderation service is down, but log it
      } else if (moderationData?.flagged) {
        toast({
          title: "Content Warning",
          description: "Your post contains content that violates our community guidelines. Please revise it.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      let imageUrl = imagePreview;
      let videoUrl = null;

      // Upload image if selected and it's a new file
      if (imageFile) {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };

        let compressedFile = imageFile;
        try {
          compressedFile = await imageCompression(imageFile, options);
        } catch (error) {
          console.error("Image compression failed:", error);
          // Fallback to original file if compression fails
        }

        const fileExt = compressedFile.name.split('.').pop();
        const fileName = `${user.id}/${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(fileName, compressedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('post-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      // Upload video if selected
      if (videoFile) {
        const fileExt = videoFile.name.split('.').pop();
        const fileName = `${user.id}/${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(fileName, videoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('post-images')
          .getPublicUrl(fileName);

        videoUrl = publicUrl;
      }

      const postData = {
        user_id: user.id,
        content: content.trim(),
        image_url: imageUrl,
        video_url: videoUrl,
        is_project_update: postType === "project_update",
        project_id: postType === "project_update" ? selectedProject : null,
      };

      if (editingPostId) {
        // Update existing post
        const { error: postError } = await supabase
          .from('posts')
          .update(postData)
          .eq('id', editingPostId);

        if (postError) throw postError;

        toast({
          title: "Post updated!",
          description: "Your post has been updated successfully.",
        });
      } else {
        // Create new post
        const { data: newPost, error: postError } = await supabase
          .from('posts')
          .insert(postData)
          .select()
          .single();

        if (postError) throw postError;

        // Handle tags
        if (tags.trim()) {
          const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
          for (const tagName of tagList) {
            // Create or get tag
            const { data: tagData, error: tagError } = await supabase
              .from('tags')
              .upsert({ name: tagName }, { onConflict: 'name' })
              .select()
              .single();

            if (!tagError && tagData) {
              // Link tag to post
              await supabase
                .from('post_tags')
                .insert({ post_id: newPost.id, tag_id: tagData.id });
            }
          }
        }

        toast({
          title: "Post created!",
          description: "Your post has been shared with everyone.",
        });
      }

      clearDraft();
      navigate("/feed");
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-background">
      <header className="sticky top-0 z-50 glass-card border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/feed")}>
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-bold">{editingPostId ? "Edit Post" : "Create Post"}</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="postType">Post Type</Label>
              <Select value={postType} onValueChange={(value: "post" | "project_update") => setPostType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select post type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="post">Regular Post</SelectItem>
                  <SelectItem value="project_update">Project Update</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {postType === "project_update" && projects.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="project">Select Project</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {postType === "project_update" && projects.length === 0 && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  You need to create a project first to post updates.{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => navigate("/projects")}
                  >
                    Create a project
                  </Button>
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                placeholder="Share your thoughts..."
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  saveDraft(e.target.value);
                }}
                className="min-h-32 resize-none"
                required
              />
            </div>

            {!editingPostId && (
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  placeholder="e.g., React, AI, WebDev"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </div>
            )}

            {imagePreview && (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full rounded-xl object-cover max-h-96"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {videoFile && (
              <div className="p-4 bg-muted rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  <span className="text-sm">{videoFile.name}</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => setVideoFile(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            <div className="flex items-center gap-4">
              <Label htmlFor="image" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted transition-colors">
                  <ImageIcon className="w-5 h-5" />
                  <span>Add Image</span>
                </div>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />
              </Label>

              <Label htmlFor="video" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted transition-colors">
                  <Video className="w-5 h-5" />
                  <span>Add Video</span>
                </div>
                <Input
                  id="video"
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleVideoSelect}
                />
              </Label>
            </div>

            <Button
              type="submit"
              disabled={loading || !content.trim() || (postType === "project_update" && !selectedProject)}
              className="w-full gradient-primary text-white hover:opacity-90"
            >
              {loading ? (editingPostId ? "Updating..." : "Posting...") : (editingPostId ? "Update Post" : "Share Post")}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
};

export default CreatePost;
