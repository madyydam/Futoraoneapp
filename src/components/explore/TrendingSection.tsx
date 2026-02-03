import { memo } from "react";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TRENDING_TOPICS, TRENDING_PROJECTS } from "./exploreConstants";

interface TrendingSectionProps {
    onTopicClick: (tag: string) => void;
    onProjectClick: (title: string) => void;
}

export const TrendingSection = memo(({ onTopicClick, onProjectClick }: TrendingSectionProps) => (
    <>
        {/* Trending Topics */}
        <section id="trending-topics">
            <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="text-primary" size={24} />
                <h2 className="text-xl font-bold text-foreground">Trending Topics</h2>
            </div>
            <div className="space-y-3">
                {TRENDING_TOPICS.map((topic, index) => (
                    <motion.div
                        key={topic.tag}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card
                            className="cursor-pointer border-2 border-black/30 dark:border-border hover:border-primary transition-all bg-card hover:shadow-lg"
                            onClick={() => onTopicClick(topic.tag)}
                        >
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-foreground">#{topic.tag}</p>
                                    <p className="text-sm text-muted-foreground">{topic.posts} posts</p>
                                </div>
                                <Badge variant="secondary" className="bg-primary text-primary-foreground">
                                    Trending
                                </Badge>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>
        </section>

        {/* Trending Projects */}
        <section id="top-projects">
            <h2 className="text-xl font-bold text-foreground mb-4">Top Projects</h2>
            <div className="space-y-3">
                {TRENDING_PROJECTS.map((project, index) => (
                    <motion.div
                        key={project.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card
                            className="cursor-pointer border-2 border-black/30 dark:border-border hover:border-primary transition-all bg-card hover:shadow-lg"
                            onClick={() => onProjectClick(project.title)}
                        >
                            <CardContent className="p-4">
                                <h3 className="font-bold text-foreground mb-1">{project.title}</h3>
                                <p className="text-sm text-muted-foreground mb-3">by {project.author}</p>
                                <div className="flex items-center justify-between">
                                    <div className="flex gap-2 flex-wrap">
                                        {project.tech.map((tech) => (
                                            <Badge key={tech} variant="outline" className="text-xs border-primary text-primary">
                                                {tech}
                                            </Badge>
                                        ))}
                                    </div>
                                    <span className="text-sm text-muted-foreground">{project.likes} likes</span>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>
        </section>
    </>
));

TrendingSection.displayName = "TrendingSection";
