import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, Users } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

interface Post {
    id: string;
    content: string;
    created_at: string;
    profiles: {
        username: string;
        full_name: string;
        avatar_url: string | null;
        is_verified?: boolean;
    };
    likes: { id: string }[];
    comments: { id: string }[];
}

// Category-specific example posts as fallback
const CATEGORY_DEMO_POSTS: { [key: string]: any[] } = {
    "AI & ML": [
        {
            id: "ai-1",
            title: "Building a Neural Network from Scratch",
            content: "Just finished implementing backpropagation manually. Understanding the math behind it makes neural networks much less magical. 🧠",
            author: "Aarav Sharma",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aarav",
            likes: 234,
            comments: 45
        },
        {
            id: "ai-2",
            title: "The Future of LLMs in 2025",
            content: "Exploring how large language models are evolving. The multimodal capabilities are game-changing!",
            author: "Priya Patel",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",
            likes: 189,
            comments: 32
        },
        {
            id: "ai-3",
            title: "Optimizing Transformer Models",
            content: "Reduced model inference time by 40% using quantization and pruning techniques. Sharing my findings!",
            author: "Rohan Mehta",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rohan",
            likes: 312,
            comments: 58
        }
    ],
    "Web Dev": [
        {
            id: "web-1",
            title: "Modern React Patterns",
            content: "Server Components in React 19 are revolutionary. No more client-side waterfalls! ⚡",
            author: "Ananya Singh",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ananya",
            likes: 456,
            comments: 67
        },
        {
            id: "web-2",
            title: "Next.js 15 Features",
            content: "The new caching strategies in Next.js 15 are incredible. Performance gains everywhere!",
            author: "Kabir Reddy",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kabir",
            likes: 378,
            comments: 54
        },
        {
            id: "web-3",
            title: "CSS Grid vs Flexbox",
            content: "Finally created a guide on when to use Grid vs Flexbox. Understanding both is key to modern layouts!",
            author: "Diya Malhotra",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Diya",
            likes: 267,
            comments: 41
        }
    ],
    "Founder's Corner": [
        {
            id: "found-1",
            title: "0 to 1 Million Users: My Journey",
            content: "Scaling a SaaS product is never a straight line. Here are the 5 biggest mistakes I made so you don't have to. #Startups #SaaS",
            author: "Vikram Malhotra",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Vikram",
            likes: 1205,
            comments: 342
        },
        {
            id: "found-2",
            title: "Raising Seed Funding in 2024",
            content: "The VC landscape has changed. Profitability > Growth at all costs. What I learned pitching to 50 investors.",
            author: "Sneha Kapoor",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sneha",
            likes: 892,
            comments: 156
        },
        {
            id: "found-3",
            title: "Finding Product-Market Fit",
            content: "If you have to ask if you have PMF, you probably don't. How to use customer feedback to pivot effectively.",
            author: "Rahul Verma",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul",
            likes: 670,
            comments: 98
        },
        {
            id: "found-4",
            title: "Building a Remote-First Team",
            content: "Hiring the best talent regardless of location changed our trajectory. Here's our async work playbook.",
            author: "Amit Patel",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Amit",
            likes: 540,
            comments: 89
        },
        {
            id: "found-5",
            title: "Bootstrapping vs VC",
            content: "Why I turned down a term sheet to stay independent. Freedom is the ultimate currency.",
            author: "Meera Das",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Meera",
            likes: 980,
            comments: 210
        },
        {
            id: "found-6",
            title: "The Art of the Pivot",
            content: "We started as a food delivery app and ended up as a logistics software. Here's the story.",
            author: "Karan Johar",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Karan",
            likes: 450,
            comments: 76
        },
        {
            id: "found-7",
            title: "Marketing for Developers",
            content: "Technical founders often ignore distribution. Build it and they will NOT come. You have to sell.",
            author: "Zoya Akhtar",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Zoya",
            likes: 1100,
            comments: 230
        },
        {
            id: "found-8",
            title: "Mental Health for Founders",
            content: "Burnout is real. How I manage stress while running a 24/7 business.",
            author: "Arjun Rampal",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun",
            likes: 1500,
            comments: 400
        },
        {
            id: "found-9",
            title: "Legal Basics for Startups",
            content: "Don't ignore the paperwork. Incorporation, IP assignment, and vesting schedules explained simply.",
            author: "Simran Kaur",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Simran",
            likes: 340,
            comments: 45
        },
        {
            id: "found-10",
            title: "Exit Strategy",
            content: "Building to sell vs building to last. How to align your company vision with your personal goals.",
            author: "Rajiv Bajaj",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rajiv",
            likes: 780,
            comments: 120
        }
    ],
    "GitG": [
        {
            id: "gitg-1",
            title: "Mastering Git Rebase",
            content: "Stop fearing `git rebase`. It keeps your history clean and makes code reviews easier. A defined guide.",
            author: "Linus T",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Linus",
            likes: 560,
            comments: 120
        },
        {
            id: "gitg-2",
            title: "Open Source Etiquette",
            content: "How to contribute to major repos without getting your PR closed immediately. Read CONTRIBUTING.md!",
            author: "Sarah Drasner",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
            likes: 890,
            comments: 230
        },
        {
            id: "gitg-3",
            title: "GitHub Actions CI/CD",
            content: "Automate your testing and deployment pipeline for free with GitHub Actions. My workflow config.",
            author: "Dev DevOps",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Dev",
            likes: 450,
            comments: 56
        },
        {
            id: "gitg-4",
            title: "Understanding Git Internals",
            content: "Blobs, trees, and commits. How Git actually stores your data under the hood.",
            author: "Scott Chacon",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Scott",
            likes: 670,
            comments: 89
        },
        {
            id: "gitg-5",
            title: "Semantic Versioning",
            content: "Why breaking changes in patch versions is a crime against humanity. SemVer explained.",
            author: "Tom Preston",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Tom",
            likes: 340,
            comments: 67
        },
        {
            id: "gitg-6",
            title: "Monorepos: Yay or Nay?",
            content: "Managing multiple packages in a single repo. Tools like Turborepo and Nx make it easy.",
            author: "Jared Palmer",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jared",
            likes: 560,
            comments: 90
        },
        {
            id: "gitg-7",
            title: "Git Hooks for Code Quality",
            content: "Using Husky to run lint-staged before commits. Never push bad code again.",
            author: "Kent C. Dodds",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kent",
            likes: 780,
            comments: 110
        },
        {
            id: "gitg-8",
            title: "Writing Good Commit Messages",
            content: "Conventional Commits standard. `feat:`, `fix:`, `chore:`. Make your log readable.",
            author: "Angie Jones",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Angie",
            likes: 900,
            comments: 140
        },
        {
            id: "gitg-9",
            title: "Handling Merge Conflicts",
            content: "Don't panic. Use a 3-way merge tool. Resolving conflicts is a skill every dev needs.",
            author: "Martin Fowler",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Martin",
            likes: 430,
            comments: 78
        },
        {
            id: "gitg-10",
            title: "Git Blame vs Git Praise",
            content: "Use `git blame` to find who wrote the code, not to shame them, but to ask for context.",
            author: "Grace Hopper",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Grace",
            likes: 1200,
            comments: 300
        }
    ]
};

const CategoryPage = () => {
    const { category } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<'trending' | 'new' | 'top'>('trending');

    useEffect(() => {
        fetchCategoryPosts();
    }, [category, activeFilter]);

    const fetchCategoryPosts = async () => {
        setLoading(true);
        try {
            const categoryKeywords: { [key: string]: string[] } = {
                "AI & ML": ["AI", "ML", "machine learning", "neural", "model", "GPT", "LLM"],
                "Web Dev": ["React", "Next", "Vue", "Angular", "CSS", "HTML", "JavaScript", "TypeScript"],
                "Cybersecurity": ["security", "encryption", "hack", "vulnerability", "penetration"],
                "Cloud": ["AWS", "Azure", "GCP", "cloud", "serverless", "kubernetes"],
                "Robotics": ["robot", "arduino", "sensor", "automation", "IoT"],
                "Blockchain": ["blockchain", "crypto", "Web3", "Solidity", "smart contract"],
                "Mobile Dev": ["mobile", "iOS", "Android", "React Native", "Flutter"],
                "Data Science": ["data", "analytics", "visualization", "pandas", "numpy"]
            };

            const keywords = categoryKeywords[category || ""] || [];

            // Query matching category or recent 80 posts so seeded category posts are always found
            const { data, error } = await supabase
                .from('posts')
                .select(`
                    id,
                    content,
                    category,
                    created_at,
                    profiles(username, full_name, avatar_url, is_verified),
                    likes(id),
                    comments(id)
                `)
                .order('created_at', { ascending: false })
                .limit(80);

            if (error) throw error;

            const filtered = (data || []).filter((post: any) =>
                (category && post.category && post.category.toLowerCase() === category.toLowerCase()) ||
                keywords.some(keyword =>
                    post.content.toLowerCase().includes(keyword.toLowerCase())
                )
            );

            setPosts(filtered);
        } catch (error) {
            console.error("Error fetching category posts:", error);
            toast({
                title: "Using demo content",
                description: "Showing example posts for this category",
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePostClick = (postId: string) => {
        navigate(`/post/${postId}`);
    };

    // Get demo posts for current category
    const demoPosts = CATEGORY_DEMO_POSTS[category || ""] || [];
    const displayPosts = posts.length > 0 ? posts : demoPosts;

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-card border-b border-border backdrop-blur-lg">
                <div className="p-4 flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-foreground capitalize">{category}</h1>
                        <p className="text-sm text-muted-foreground">
                            {displayPosts.length} {displayPosts.length === 1 ? 'post' : 'posts'}
                        </p>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="px-4 pb-3 flex gap-2">
                    <Button
                        variant={activeFilter === 'trending' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveFilter('trending')}
                        className="gap-1"
                    >
                        <TrendingUp className="w-4 h-4" />
                        Trending
                    </Button>
                    <Button
                        variant={activeFilter === 'new' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveFilter('new')}
                    >
                        New
                    </Button>
                    <Button
                        variant={activeFilter === 'top' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveFilter('top')}
                    >
                        Top
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                {loading ? (
                    // Loading skeleton
                    Array(3).fill(0).map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-muted" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-muted rounded w-1/3" />
                                        <div className="h-3 bg-muted rounded w-1/4" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-4 bg-muted rounded" />
                                    <div className="h-4 bg-muted rounded w-5/6" />
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : displayPosts.length === 0 ? (
                    <Card className="bg-card border-border">
                        <CardContent className="p-12 text-center">
                            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                            <p className="text-muted-foreground">
                                Be the first to post about {category}!
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    displayPosts.map((post, index) => {
                        // Handle both real posts and demo posts
                        const isRealPost = 'profiles' in post;
                        const author = isRealPost ? post.profiles.full_name : (post as any).author;
                        const username = isRealPost ? post.profiles.username : (post as any).author.replace(/\s+/g, '').toLowerCase();
                        const avatar = isRealPost ? post.profiles.avatar_url : (post as any).avatar;
                        const content = isRealPost ? post.content : (post as any).content;
                        const title = isRealPost ? content.split('\n')[0] : (post as any).title;
                        const likes = isRealPost ? post.likes?.length || 0 : (post as any).likes;
                        const comments = isRealPost ? post.comments?.length || 0 : (post as any).comments;

                        return (
                            <motion.div
                                key={post.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card
                                    className="bg-card border-2 border-black/20 dark:border-border hover:border-primary transition-all cursor-pointer hover:shadow-lg"
                                    onClick={() => handlePostClick(post.id)}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="w-10 h-10">
                                                    <AvatarImage src={avatar || undefined} />
                                                    <AvatarFallback className="bg-primary/10 text-primary">
                                                        {author?.[0]?.toUpperCase() || 'U'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-semibold text-sm">{author}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {isRealPost ? new Date(post.created_at).toLocaleDateString() : '2 hours ago'}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge variant="secondary" className="text-xs">
                                                {category}
                                            </Badge>
                                        </div>

                                        <h3 className="font-bold text-base mb-2 line-clamp-2">
                                            {title}
                                        </h3>

                                        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                                            {content}
                                        </p>

                                        <div className="flex items-center gap-6 text-muted-foreground text-sm">
                                            <span className="flex items-center gap-1.5 hover:text-red-500 transition-colors">
                                                ❤️ {likes}
                                            </span>
                                            <span className="flex items-center gap-1.5 hover:text-blue-500 transition-colors">
                                                💬 {comments}
                                            </span>
                                            <span className="flex items-center gap-1.5 hover:text-orange-500 transition-colors">
                                                🔥 {Math.floor(Math.random() * 20) + 1}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })
                )}
            </div>

            <BottomNav />
        </div>
    );
};

export default CategoryPage;
