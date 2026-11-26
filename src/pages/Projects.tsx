import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Plus, ArrowLeft, Heart, Github, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BottomNav } from "@/components/BottomNav";
import type { User } from "@supabase/supabase-js";
import { CartoonLoader } from "@/components/CartoonLoader";
import { sanitizeExternalUrl } from "@/lib/security";

interface Project {
  id: string;
  title: string;
  description: string;
  tech_stack: string[];
  github_url: string;
  live_url: string;
  created_at: string;
  profiles: {
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
  project_likes: { id: string; user_id: string }[];
}

const Projects = () => {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    tech_stack: "",
    github_url: "",
    live_url: "",
  });
  const navigate = useNavigate();
  const { toast } = useToast();

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
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProjects = async () => {
    try {
      // Fetch projects with likes
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          project_likes(id, user_id)
        `)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // Get unique user IDs
      const userIds = [...new Set(projectsData?.map(p => p.user_id) || [])];

      // Fetch profiles for those users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Create a map of profiles by user ID
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      // Combine projects with their profiles
      const projectsWithProfiles = projectsData?.map(project => ({
        ...project,
        profiles: profilesMap.get(project.user_id) || {
          username: 'Unknown',
          full_name: 'Unknown User',
          avatar_url: null
        }
      })) || [];

      setProjects(projectsWithProfiles as unknown as Project[]);
    } catch (error) {
      toast({
        title: "Error loading projects",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const safeGithub = sanitizeExternalUrl(formData.github_url);
      const safeLive = sanitizeExternalUrl(formData.live_url);
      if (formData.github_url.trim() && !safeGithub) {
        throw new Error("GitHub URL must start with https:// or http://");
      }
      if (formData.live_url.trim() && !safeLive) {
        throw new Error("Live URL must start with https:// or http://");
      }

      const { error } = await supabase.from('projects').insert({
        user_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        tech_stack: formData.tech_stack.split(',').map(s => s.trim()).filter(Boolean),
        github_url: safeGithub || null,
        live_url: safeLive || null,
      });

      if (error) throw error;

      toast({
        title: "Project created!",
        description: "Your project has been added successfully.",
      });

      setDialogOpen(false);
      setFormData({ title: "", description: "", tech_stack: "", github_url: "", live_url: "" });
      fetchProjects();
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const toggleLike = async (projectId: string) => {
    if (!user) return;

    const project = projects.find(p => p.id === projectId);
    const hasLiked = project?.project_likes.some((like) => like.user_id === user.id);

    try {
      if (hasLiked) {
        const likeId = project?.project_likes.find((like) => like.user_id === user.id)?.id;
        await supabase.from('project_likes').delete().eq('id', likeId);
      } else {
        await supabase.from('project_likes').insert({
          user_id: user.id,
          project_id: projectId,
        });
      }
      fetchProjects();
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <CartoonLoader />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-background pb-24">
      <header className="sticky top-0 z-10 glass-card border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/feed")}>
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-bold gradient-text">Projects</h1>
          <Button onClick={() => setDialogOpen(true)} size="sm" className="gradient-primary text-white">
            <Plus className="w-4 h-4 mr-2" />
            New
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {projects.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No projects yet. Create your first one!</p>
            <Button onClick={() => setDialogOpen(true)} className="gradient-primary text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </Card>
        ) : (
          projects.map((project) => (
            <Card key={project.id} className="overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="w-10 h-10 border-2 border-primary">
                    <AvatarImage src={project.profiles.avatar_url || undefined} />
                    <AvatarFallback>{project.profiles.username[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{project.profiles.full_name}</h3>
                    <p className="text-sm text-muted-foreground">@{project.profiles.username}</p>
                  </div>
                </div>

                <h2 className="text-2xl font-bold mb-2">{project.title}</h2>
                <p className="text-muted-foreground mb-4">{project.description}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {project.tech_stack?.map((tech: string, i: number) => (
                    <Badge key={i} variant="secondary">{tech}</Badge>
                  ))}
                </div>

                <div className="flex items-center gap-4 mb-4">
                  {sanitizeExternalUrl(project.github_url) && (
                    <a
                      href={sanitizeExternalUrl(project.github_url)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Github className="w-4 h-4" />
                      GitHub
                    </a>
                  )}
                  {sanitizeExternalUrl(project.live_url) && (
                    <a
                      href={sanitizeExternalUrl(project.live_url)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Live Demo
                    </a>
                  )}
                </div>

                <div className="flex items-center pt-4 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleLike(project.id)}
                    className={project.project_likes.some((like) => like.user_id === user?.id) ? "text-secondary" : ""}
                  >
                    <Heart
                      className={`w-5 h-5 mr-2 ${project.project_likes.some((like) => like.user_id === user?.id) ? "fill-secondary" : ""
                        }`}
                    />
                    {project.project_likes.length}
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Project Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tech_stack">Tech Stack (comma-separated)</Label>
              <Input
                id="tech_stack"
                value={formData.tech_stack}
                onChange={(e) => setFormData({ ...formData, tech_stack: e.target.value })}
                placeholder="React, TypeScript, Tailwind"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="github_url">GitHub URL</Label>
              <Input
                id="github_url"
                type="url"
                value={formData.github_url}
                onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                placeholder="https://github.com/username/repo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="live_url">Live URL</Label>
              <Input
                id="live_url"
                type="url"
                value={formData.live_url}
                onChange={(e) => setFormData({ ...formData, live_url: e.target.value })}
                placeholder="https://yourproject.com"
              />
            </div>

            <Button type="submit" className="w-full gradient-primary text-white">
              Create Project
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default React.memo(Projects);
