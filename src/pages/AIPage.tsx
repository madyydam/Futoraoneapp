import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Bot, Sparkles, Code, FileText, Lightbulb, Zap, Cpu, Globe, Network, MessageSquare, BookOpen, ShieldAlert, Layers } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const AIPage = () => {
    const navigate = useNavigate();
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (rafRef.current !== null) return;
            const clientX = e.clientX;
            const clientY = e.clientY;
            rafRef.current = requestAnimationFrame(() => {
                rafRef.current = null;
                setMousePosition({
                    x: (clientX / window.innerWidth) * 2 - 1,
                    y: (clientY / window.innerHeight) * 2 - 1,
                });
            });
        };
        window.addEventListener("mousemove", handleMouseMove, { passive: true });
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    const tools = [
        {
            id: "roadmap",
            title: "AI Roadmap Generator",
            description: "Generate personalized learning paths for any technology.",
            icon: <Sparkles className="w-8 h-8 text-cyan-400" />,
            color: "from-cyan-500/20 to-blue-500/20",
            border: "hover:border-cyan-500/50",
            action: () => navigate("/ai-roadmap"),
            delay: 0,
        },
        {
            id: "project-ideas",
            title: "Project Ideas",
            description: "Generate unique project ideas based on your skills.",
            icon: <Lightbulb className="w-8 h-8 text-yellow-400" />,
            color: "from-yellow-500/20 to-orange-500/20",
            border: "hover:border-yellow-500/50",
            action: () => navigate("/project-ideas"),
            comingSoon: false,
            delay: 0.1,
        },
        {
            id: "code-assistant",
            title: "Code Assistant",
            description: "Get instant help with debugging and code optimization.",
            icon: <Code className="w-8 h-8 text-purple-400" />,
            color: "from-purple-500/20 to-pink-500/20",
            border: "hover:border-purple-500/50",
            action: () => { }, // Placeholder
            comingSoon: true,
            delay: 0.2,
        },
        {
            id: "resume-review",
            title: "Resume Reviewer",
            description: "AI-powered analysis to improve your developer resume.",
            icon: <FileText className="w-8 h-8 text-green-400" />,
            color: "from-green-500/20 to-emerald-500/20",
            border: "hover:border-green-500/50",
            action: () => { }, // Placeholder
            comingSoon: true,
            delay: 0.3,
        },
    ];

    const comingSoonTools = [
        {
            id: "mock-interviewer",
            title: "AI Mock Interviewer",
            description: "Practice technical interviews with real-time AI feedback.",
            icon: <MessageSquare className="w-8 h-8 text-pink-400" />,
            color: "from-pink-500/20 to-rose-500/20",
            border: "hover:border-pink-500/50",
            action: () => { },
            comingSoon: true,
            delay: 0.4,
        },
        {
            id: "auto-docs",
            title: "Auto Documentation",
            description: "Generate comprehensive documentation from your codebase instantly.",
            icon: <BookOpen className="w-8 h-8 text-indigo-400" />,
            color: "from-indigo-500/20 to-violet-500/20",
            border: "hover:border-indigo-500/50",
            action: () => { },
            comingSoon: true,
            delay: 0.5,
        },
        {
            id: "bug-predictor",
            title: "Bug Predictor",
            description: "Analyze code patterns to predict and prevent potential bugs.",
            icon: <ShieldAlert className="w-8 h-8 text-red-400" />,
            color: "from-red-500/20 to-orange-500/20",
            border: "hover:border-red-500/50",
            action: () => { },
            comingSoon: true,
            delay: 0.6,
        },
        {
            id: "stack-advisor",
            title: "Tech Stack Advisor",
            description: "Get personalized tech stack recommendations for your projects.",
            icon: <Layers className="w-8 h-8 text-teal-400" />,
            color: "from-teal-500/20 to-emerald-500/20",
            border: "hover:border-teal-500/50",
            action: () => { },
            comingSoon: true,
            delay: 0.7,
        },
    ];

    const allTools = [...tools, ...comingSoonTools];

    return (
        <div className="dark">
            <div className="min-h-screen bg-black text-white overflow-hidden relative selection:bg-cyan-500/30">
                {/* Dynamic Background */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 bg-grid-pattern opacity-20" />
                    <motion.div
                        animate={{
                            x: mousePosition.x * 20,
                            y: mousePosition.y * 20
                        }}
                        className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px]"
                    />
                    <motion.div
                        animate={{
                            x: mousePosition.x * -20,
                            y: mousePosition.y * -20
                        }}
                        className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/20 rounded-full blur-[120px]"
                    />
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]" />
                </div>

                <header className="relative z-10 p-4 flex items-center border-b border-white/10 bg-black/50 backdrop-blur-xl">
                    <Button
                        variant="ghost"
                        onClick={() => navigate("/feed")}
                        className="text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-300 hover:scale-105"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Back
                    </Button>
                    <h1 className="ml-4 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 animate-pulse">
                        Futora AI
                    </h1>
                </header>

                <main className="relative z-10 max-w-6xl mx-auto px-4 py-12">
                    <div className="text-center mb-20 relative">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8, type: "spring" }}
                            className="relative z-10"
                        >
                            <div className="inline-flex items-center justify-center p-4 mb-8 rounded-full bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-white/10 backdrop-blur-md shadow-[0_0_30px_rgba(6,182,212,0.3)] animate-float">
                                <Bot className="w-8 h-8 text-cyan-400 mr-3 animate-bounce" />
                                <span className="text-lg font-medium text-cyan-200 tracking-wide">Next Gen AI Tools</span>
                            </div>
                            <h2 className="text-5xl md:text-7xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-200 to-purple-200 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                                Unleash Your Potential
                            </h2>
                            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                                Experience the future of development with our suite of <span className="text-cyan-400 font-semibold">AI-powered</span> tools.
                                Build faster, smarter, and more creatively.
                            </p>
                        </motion.div>

                        {/* Decorative Elements */}
                        <Cpu className="absolute top-0 left-[20%] w-12 h-12 text-purple-500/20 animate-spin-slow" />
                        <Globe className="absolute bottom-0 right-[20%] w-16 h-16 text-cyan-500/20 animate-pulse" />
                        <Network className="absolute top-[50%] right-[10%] w-10 h-10 text-pink-500/20 animate-bounce" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 perspective-1000">
                        {allTools.map((tool) => (
                            <motion.div
                                key={tool.id}
                                initial={{ opacity: 0, y: 50, rotateX: -10 }}
                                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                                transition={{ delay: tool.delay, duration: 0.6 }}
                                onHoverStart={() => setHoveredCard(tool.id)}
                                onHoverEnd={() => setHoveredCard(null)}
                                className="group"
                            >
                                <Card
                                    className={`h-full p-8 bg-gradient-to-br ${tool.color} border border-white/10 ${tool.border} transition-all duration-500 cursor-pointer relative overflow-hidden backdrop-blur-sm hover:shadow-[0_0_50px_rgba(124,58,237,0.2)] hover:-translate-y-2`}
                                    onClick={tool.action}
                                >
                                    <div className="relative z-10">
                                        <div className="mb-6 p-4 bg-black/40 rounded-2xl w-fit backdrop-blur-md border border-white/10 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg">
                                            {tool.icon}
                                        </div>
                                        <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-cyan-300 transition-colors">
                                            {tool.title}
                                        </h3>
                                        <p className="text-gray-400 text-base mb-6 leading-relaxed">
                                            {tool.description}
                                        </p>

                                        {tool.comingSoon ? (
                                            <span className="inline-flex items-center px-4 py-1.5 text-xs font-bold uppercase tracking-wider bg-white/5 rounded-full text-gray-400 border border-white/5 group-hover:bg-white/10 transition-colors">
                                                Coming Soon
                                            </span>
                                        ) : (
                                            <div className="flex items-center text-cyan-400 font-semibold group-hover:translate-x-2 transition-transform duration-300">
                                                Try Now <Zap className="w-5 h-5 ml-2 group-hover:text-yellow-400 transition-colors" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Hover Effects */}
                                    <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 transition-transform duration-1000 ease-in-out ${hoveredCard === tool.id ? 'translate-x-[200%]' : 'translate-x-[-200%]'}`} />
                                    <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors duration-500" />
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AIPage;
