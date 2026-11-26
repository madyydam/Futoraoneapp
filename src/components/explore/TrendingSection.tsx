import { memo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Github, ExternalLink, Star, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { TRENDING_PROJECTS, TRENDING_TOPICS_FALLBACK } from "./exploreConstants";

interface TopicData {
    tag: string;
    count: number;
    posts: { id: string; content: string; created_at: string }[];
}

interface TrendingSectionProps {
    onTopicClick: (tag: string) => void;
    onProjectClick: (title: string) => void;
}

export const TrendingSection = memo(({ onTopicClick, onProjectClick }: TrendingSectionProps) => {
    const [topics, setTopics] = useState<TopicData[]>([]);
    const [loadingTopics, setLoadingTopics] = useState(true);
    const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
    const [topicPosts, setTopicPosts] = useState<Record<string, { id: string; content: string; created_at: string }[]>>({});
    const [loadingPosts, setLoadingPosts] = useState<string | null>(null);

    // Fetch real topic counts from DB
    useEffect(() => {
        const fetchTopics = async () => {
            setLoadingTopics(true);
            try {
                // Fetch up to 500 posts with tags + category
                const { data, error } = await supabase
                    .from("posts")
                    .select("tags, category")
                    .limit(500);

                if (error) throw error;

                // Count tags and categories
                const tagMap: Record<string, number> = {};
                (data || []).forEach((p) => {
                    const tags: string[] = Array.isArray(p.tags) ? p.tags : [];
                    tags.forEach((tag) => {
                        if (tag?.trim()) tagMap[tag.trim()] = (tagMap[tag.trim()] || 0) + 1;
                    });
                    if (p.category?.trim()) {
                        // Only count category if not already counted by tag
                        const cat = p.category.trim();
                        tagMap[cat] = (tagMap[cat] || 0) + 1;
                    }
                });

                const sorted = Object.entries(tagMap)
                    .sort((a, b) => b[1] - a[1])
                    // Deduplicate similar tags (e.g., "Data Science" vs "DataScience")
                    .filter(([tag], idx, arr) => {
                        const normalised = tag.toLowerCase().replace(/\s/g, "");
                        return arr.findIndex(([t]) => t.toLowerCase().replace(/\s/g, "") === normalised) === idx;
                    })
                    .slice(0, 8)
                    .map(([tag, count]) => ({ tag, count, posts: [] }));

                setTopics(sorted.length > 0 ? sorted : TRENDING_TOPICS_FALLBACK.map(t => ({ tag: t.tag, count: parseInt(t.posts), posts: [] })));
            } catch {
                // Fallback to static data
                setTopics(TRENDING_TOPICS_FALLBACK.map(t => ({ tag: t.tag, count: parseInt(t.posts), posts: [] })));
            } finally {
                setLoadingTopics(false);
            }
        };
        fetchTopics();
    }, []);

    // Fetch posts for a topic when expanded
    const handleTopicExpand = async (tag: string) => {
        if (expandedTopic === tag) {
            setExpandedTopic(null);
            return;
        }
        setExpandedTopic(tag);

        if (topicPosts[tag]) return; // already loaded

        setLoadingPosts(tag);
        try {
            // Try tags array contains
            const { data: tagData } = await supabase
                .from("posts")
                .select("id, content, created_at")
                .contains("tags", [tag])
                .order("created_at", { ascending: false })
                .limit(4);

            // Also try category
            const { data: catData } = await supabase
                .from("posts")
                .select("id, content, created_at")
                .eq("category", tag)
                .order("created_at", { ascending: false })
                .limit(4);

            const combined = [...(tagData || []), ...(catData || [])];
            // Deduplicate by id
            const unique = combined.filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i).slice(0, 4);
            setTopicPosts(prev => ({ ...prev, [tag]: unique }));
        } catch {
            setTopicPosts(prev => ({ ...prev, [tag]: [] }));
        } finally {
            setLoadingPosts(null);
        }
    };

    const formatCount = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();

    return (
        <>
            {/* ── Trending Topics ── */}
            <section id="trending-topics">
                <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="text-primary" size={24} />
                    <h2 className="text-xl font-bold text-foreground">Trending Topics</h2>
                    {!loadingTopics && (
                        <Badge variant="secondary" className="ml-auto text-xs">Live</Badge>
                    )}
                </div>

                {loadingTopics ? (
                    <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Loading real topics...</span>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {topics.map((topic, index) => (
                            <motion.div
                                key={topic.tag}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.06 }}
                            >
                                <Card className="border-2 border-black/30 dark:border-border hover:border-primary transition-all bg-card hover:shadow-lg">
                                    {/* Header row */}
                                    <CardContent className="p-4">
                                        <div
                                            className="flex items-center justify-between cursor-pointer"
                                            onClick={() => onTopicClick(topic.tag)}
                                        >
                                            <div>
                                                <p className="font-semibold text-foreground">#{topic.tag}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {formatCount(topic.count)} posts
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="bg-primary text-primary-foreground">
                                                    Trending
                                                </Badge>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleTopicExpand(topic.tag); }}
                                                    className="ml-1 p-1 rounded-full hover:bg-muted transition-colors"
                                                    aria-label={expandedTopic === topic.tag ? "Collapse" : "Show posts"}
                                                >
                                                    {expandedTopic === topic.tag
                                                        ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                                        : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expandable posts list */}
                                        <AnimatePresence>
                                            {expandedTopic === topic.tag && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="mt-3 pt-3 border-t border-border space-y-2">
                                                        {loadingPosts === topic.tag ? (
                                                            <div className="flex items-center gap-2 py-2 text-muted-foreground text-sm">
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                                Loading posts...
                                                            </div>
                                                        ) : (topicPosts[topic.tag] || []).length === 0 ? (
                                                            <p className="text-xs text-muted-foreground py-2">No posts found for this topic yet.</p>
                                                        ) : (
                                                            (topicPosts[topic.tag] || []).map((post) => (
                                                                <div
                                                                    key={post.id}
                                                                    className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5 leading-relaxed line-clamp-2"
                                                                >
                                                                    {post.content}
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </section>

            {/* ── Top Projects (Real GitHub) ── */}
            <section id="top-projects">
                <div className="flex items-center gap-2 mb-4">
                    <Github className="text-foreground" size={22} />
                    <h2 className="text-xl font-bold text-foreground">Top Projects</h2>
                    <Badge variant="outline" className="ml-auto text-xs border-green-500/50 text-green-600 dark:text-green-400">
                        Real GitHub
                    </Badge>
                </div>
                <div className="space-y-3">
                    {TRENDING_PROJECTS.map((project, index) => (
                        <motion.div
                            key={project.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.08 }}
                        >
                            <Card className="border-2 border-black/30 dark:border-border hover:border-primary transition-all bg-card hover:shadow-lg">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-1">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-foreground text-base">{project.title}</h3>
                                            <p className="text-xs text-muted-foreground mb-2">by {project.author}</p>
                                        </div>
                                        <div className="flex items-center gap-1 ml-2 shrink-0">
                                            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                                            <span className="text-xs font-semibold text-muted-foreground">{project.stars}</span>
                                        </div>
                                    </div>

                                    <p className="text-xs text-muted-foreground mb-3 leading-relaxed line-clamp-2">
                                        {project.description}
                                    </p>

                                    <div className="flex items-center justify-between">
                                        <div className="flex gap-1.5 flex-wrap">
                                            {project.tech.map((tech) => (
                                                <Badge key={tech} variant="outline" className="text-[10px] border-primary/40 text-primary px-2 py-0">
                                                    {tech}
                                                </Badge>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-2 ml-2 shrink-0">
                                            <a
                                                href={project.githubUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                                                aria-label="GitHub"
                                            >
                                                <Github className="w-4 h-4 text-foreground" />
                                            </a>
                                            <a
                                                href={project.liveUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                                                aria-label="Live site"
                                            >
                                                <ExternalLink className="w-4 h-4 text-primary" />
                                            </a>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </section>
        </>
    );
});

TrendingSection.displayName = "TrendingSection";
