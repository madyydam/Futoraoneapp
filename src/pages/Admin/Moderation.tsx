import { useEffect, useState, useCallback, memo, useMemo } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    MessageSquare,
    Trash2,
    Search,
    Briefcase
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area";

const CommentItem = memo(({ comment, onDelete }: { comment: any; onDelete: (id: string) => void }) => (
    <div className="flex gap-4 items-start border-b border-slate-100 pb-5 last:border-0 hover:bg-slate-50/50 p-2 rounded-xl transition-colors">
        <Avatar className="w-10 h-10 border border-slate-200">
            <AvatarImage src={comment.profiles?.avatar_url} />
            <AvatarFallback className="bg-slate-100 text-slate-900 font-bold">{comment.profiles?.username?.[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-900">@{comment.profiles?.username}</p>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{new Date(comment.created_at).toLocaleDateString()}</span>
            </div>
            <p className="text-sm text-slate-600 font-medium leading-relaxed">{comment.content}</p>
        </div>
        <Button
            variant="ghost"
            size="icon"
            className="text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            onClick={() => onDelete(comment.id)}
        >
            <Trash2 className="w-4 h-4" />
        </Button>
    </div>
));

CommentItem.displayName = "CommentItem";

const PostCard = memo(({ post, onDelete, onViewComments }: { post: any; onDelete: (id: string) => void; onViewComments: (id: string) => void }) => (
    <Card className="overflow-hidden border-slate-200 shadow-xl shadow-slate-200/30 rounded-3xl hover:shadow-primary/5 transition-all group h-full flex flex-col">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <div className="flex justify-between items-start">
                <div className="flex gap-4">
                    <Avatar className="w-12 h-12 border-2 border-slate-100 group-hover:border-primary transition-all">
                        <AvatarImage src={post.profiles?.avatar_url} />
                        <AvatarFallback className="bg-slate-200 text-slate-900 font-black">{post.profiles?.username?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-black text-slate-900 text-sm">@{post.profiles?.username || "Unknown User"}</h4>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                            {new Date(post.created_at).toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>
        </CardHeader>
        <CardContent className="pt-6 flex-1 flex flex-col">
            <div className="space-y-4 flex-1">
                <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl text-slate-700 font-medium leading-relaxed">
                    {post.content}
                </div>
                {post.image_url && (
                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-inner">
                        <img src={post.image_url} alt="Post content" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                )}
            </div>
            <div className="flex gap-3 pt-6 justify-end items-center">
                <Button variant="outline" className="gap-3 h-10 px-5 border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl font-bold transition-all shadow-sm" onClick={() => onViewComments(post.id)}>
                    <MessageSquare size={16} />
                    Comments
                </Button>

                <Button
                    variant="destructive"
                    className="gap-3 h-10 px-5 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white border-red-100 hover:border-red-500 rounded-xl font-bold transition-all shadow-sm shadow-red-200/50"
                    onClick={() => {
                        if (confirm("Delete this post?")) {
                            onDelete(post.id);
                        }
                    }}
                >
                    <Trash2 size={16} />
                    Delete
                </Button>
            </div>
        </CardContent>
    </Card>
));

PostCard.displayName = "PostCard";

const ProjectCard = memo(({ project, onDelete }: { project: any; onDelete: (id: string) => void }) => (
    <Card className="overflow-hidden border-slate-200 shadow-xl shadow-slate-200/30 rounded-3xl hover:shadow-primary/5 transition-all group h-full flex flex-col">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <div className="flex justify-between items-start">
                <div className="flex gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-sm group-hover:scale-110 transition-transform duration-500">
                        <Briefcase size={24} />
                    </div>
                    <div>
                        <h4 className="font-black text-slate-900 text-lg leading-tight line-clamp-1">{project.title}</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                            Architecture by @{project.profiles?.username || "Unknown"}
                        </p>
                    </div>
                </div>
            </div>
        </CardHeader>
        <CardContent className="pt-6 flex-1 flex flex-col">
            <div className="space-y-4 flex-1">
                <p className="text-slate-600 font-medium leading-relaxed line-clamp-3">
                    {project.description}
                </p>
            </div>

            <div className="flex items-center justify-between pt-6 mt-auto">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">
                    Built {new Date(project.created_at).toLocaleDateString()}
                </span>

                <Button
                    variant="destructive"
                    className="gap-3 h-10 px-5 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white border-red-100 hover:border-red-500 rounded-xl font-bold transition-all shadow-sm shadow-red-200/50"
                    onClick={() => {
                        if (confirm("Delete this project?")) {
                            onDelete(project.id);
                        }
                    }}
                >
                    <Trash2 size={16} />
                    Delete
                </Button>
            </div>
        </CardContent>
    </Card>
));

ProjectCard.displayName = "ProjectCard";

const ModerationPage = () => {
    const [posts, setPosts] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPostComments, setSelectedPostComments] = useState<any[]>([]);
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const { toast } = useToast();

    const fetchPosts = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("posts")
                .select(`
                    *,
                    profiles:user_id (
                        username,
                        avatar_url
                    )
                `)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setPosts(data || []);
        } catch (error) {
            console.error("Error fetching posts:", error);
            toast({ title: "Error", description: "Failed to fetch posts", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    const fetchProjects = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("projects")
                .select(`
                    *,
                    profiles:user_id (
                        username,
                        avatar_url
                    )
                `)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setProjects(data || []);
        } catch (error) {
            console.error("Error fetching projects:", error);
        }
    }, []);

    useEffect(() => {
        fetchPosts();
        fetchProjects();
    }, [fetchPosts, fetchProjects]);

    const deletePost = useCallback(async (postId: string) => {
        try {
            const { error } = await supabase.from("posts").delete().eq("id", postId);
            if (error) throw error;
            setPosts(prev => prev.filter(p => p.id !== postId));
            toast({ title: "Post Deleted", description: "The post has been permanently removed." });
        } catch (error) {
            console.error("Error deleting post:", error);
            toast({ title: "Error", description: "Failed to delete post", variant: "destructive" });
        }
    }, [toast]);

    const deleteProject = useCallback(async (projectId: string) => {
        try {
            const { error } = await supabase.from("projects").delete().eq("id", projectId);
            if (error) throw error;
            setProjects(prev => prev.filter(p => p.id !== projectId));
            toast({ title: "Project Deleted", description: "The project has been removed." });
        } catch (error) {
            console.error("Error deleting project:", error);
            toast({ title: "Error", description: "Failed to delete project", variant: "destructive" });
        }
    }, [toast]);

    const fetchComments = useCallback(async (postId: string) => {
        try {
            const { data, error } = await supabase
                .from("comments")
                .select(`
                    *,
                    profiles:user_id (
                        username,
                        avatar_url
                    )
                `)
                .eq("post_id", postId)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setSelectedPostComments(data || []);
            setIsCommentsOpen(true);
        } catch (error) {
            console.error("Error fetching comments:", error);
            toast({ title: "Error", description: "Failed to fetch comments", variant: "destructive" });
        }
    }, [toast]);

    const deleteComment = useCallback(async (commentId: string) => {
        try {
            const { error } = await supabase.from("comments").delete().eq("id", commentId);
            if (error) throw error;
            setSelectedPostComments(prev => prev.filter(c => c.id !== commentId));
            toast({ title: "Comment Deleted", description: "The comment has been removed." });
        } catch (error) {
            console.error("Error deleting comment:", error);
            toast({ title: "Error", description: "Failed to delete comment", variant: "destructive" });
        }
    }, [toast]);

    const filteredPosts = useMemo(() => {
        return posts.filter(post =>
            post.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            post.profiles?.username?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [posts, searchTerm]);

    const filteredProjects = useMemo(() => {
        return projects.filter(project =>
            project.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            project.profiles?.username?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [projects, searchTerm]);

    return (
        <AdminLayout>
            <div className="space-y-10 pb-20">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-2">Content Moderation</h2>
                        <p className="text-slate-500 font-medium italic">Manage user posts and projects.</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/20 max-w-2xl">
                    <div className="relative flex-1">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <Input
                            placeholder="Search posts, projects, or users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-14 h-14 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-slate-900 font-medium placeholder:text-slate-300 text-lg"
                        />
                    </div>
                </div>

                <Tabs defaultValue="posts" className="space-y-8">
                    <TabsList className="bg-slate-100 p-1 rounded-2xl h-14 border border-slate-200 shadow-inner">
                        <TabsTrigger value="posts" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg shadow-slate-200">Posts</TabsTrigger>
                        <TabsTrigger value="projects" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg shadow-slate-200">Projects</TabsTrigger>
                    </TabsList>

                    <TabsContent value="posts" className="space-y-6">
                        {loading ? (
                            <div className="flex justify-center py-20">
                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-100 border-b-primary"></div>
                            </div>
                        ) : (
                            <div className="grid gap-6 md:grid-cols-2">
                                {filteredPosts.length > 0 ? (
                                    filteredPosts.map(post => (
                                        <PostCard key={post.id} post={post} onDelete={deletePost} onViewComments={fetchComments} />
                                    ))
                                ) : (
                                    <p className="text-center text-slate-400 font-medium py-20 col-span-2">No posts found.</p>
                                )}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="projects" className="space-y-6">
                        {loading ? (
                            <div className="flex justify-center py-20">
                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-100 border-b-primary"></div>
                            </div>
                        ) : (
                            <div className="grid gap-6 md:grid-cols-2">
                                {filteredProjects.length > 0 ? (
                                    filteredProjects.map(project => (
                                        <ProjectCard key={project.id} project={project} onDelete={deleteProject} />
                                    ))
                                ) : (
                                    <p className="text-center text-slate-400 font-medium py-20 col-span-2">No projects found.</p>
                                )}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            <Dialog open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] bg-white border-slate-200 rounded-[2rem] shadow-2xl p-0 overflow-hidden">
                    <DialogHeader className="p-8 bg-slate-50/50 border-b border-slate-100">
                        <DialogTitle className="text-2xl font-black text-slate-900">Comments</DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium">
                            Comments on this post.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[50vh] px-8 py-6">
                        <div className="space-y-6">
                            {selectedPostComments.length === 0 ? (
                                <p className="text-center text-slate-400 font-medium py-10 italic">No comments found.</p>
                            ) : selectedPostComments.map(comment => (
                                <CommentItem
                                    key={comment.id}
                                    comment={comment}
                                    onDelete={deleteComment}
                                />
                            ))}
                        </div>
                    </ScrollArea>
                    <div className="p-6 bg-slate-50/30 border-t border-slate-100 flex justify-end">
                        <Button variant="outline" onClick={() => setIsCommentsOpen(false)} className="rounded-xl font-bold">Dismiss Report</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
};

export default ModerationPage;
