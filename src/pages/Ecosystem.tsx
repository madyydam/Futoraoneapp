import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Rocket, Zap, Bot, ArrowUpRight, ShieldCheck, CreditCard, Briefcase, LineChart, Users, Fingerprint, Signal, Brain, Wallet, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const Ecosystem = () => {
    const navigate = useNavigate();

    const platforms = [
        {
            name: "FutoraFlow",
            tagline: "AI Business Operating System",
            description: "Unified dashboard for tasks, automation, and growth. Command your business with AI.",
            url: "https://futoraflow.vercel.app/",
            icon: <Bot className="w-6 h-6 text-purple-400" />,
            color: "from-purple-500 to-indigo-500",
            border: "border-purple-500/50",
            cta: "View Platform"
        },
        {
            name: "Futora Finance",
            tagline: "Next-Gen Financial Stack",
            description: "Manage wealth, payments, and investments with autonomous AI agents.",
            url: "https://futorapay.vercel.app/",
            icon: <CreditCard className="w-6 h-6 text-emerald-400" />,
            color: "from-emerald-500 to-green-500",
            border: "border-emerald-500/50",
            cta: "Visit App"
        },
        {
            name: "FutoraLift",
            tagline: "Growth at Scale",
            description: "AI-powered marketing agency helping brands scale faster.",
            url: "https://futoralift.vercel.app/",
            icon: <ArrowUpRight className="w-6 h-6 text-blue-400" />,
            color: "from-blue-500 to-cyan-500",
            border: "border-blue-500/50",
            cta: "View Website"
        },
        {
            name: "Futora AI",
            tagline: "Intelligence Unlocked",
            description: "Advanced AI models and cognitive services powering the entire ecosystem.",
            url: "https://futoraai.vercel.app/",
            icon: <Zap className="w-6 h-6 text-amber-400" />,
            color: "from-amber-500 to-orange-500",
            border: "border-amber-500/50",
            cta: "Learn More"
        }
    ];

    const upcomingPlatforms = [
        {
            name: "FutoraJobs Lite",
            description: "Startup jobs platform for proof of work",
            category: "JOBS",
            categoryColor: "text-zinc-500",
            icon: <Briefcase className="w-5 h-5 text-zinc-500" />,
            borderColor: "border-zinc-800",
            badge: "IN DEV"
        },
        {
            name: "FutoraAgents",
            description: "Builder for autonomous AI agents & workflows",
            category: "AI",
            categoryColor: "text-cyan-400",
            icon: <Brain className="w-5 h-5 text-cyan-400" />,
            borderColor: "border-cyan-500/60",
            badge: "IN DEV"
        },
        {
            name: "FutoraSense",
            description: "AI platform that senses business signals, risk...",
            category: "LAUNCHING SOON",
            categoryColor: "text-indigo-400",
            icon: <Signal className="w-5 h-5 text-indigo-400" />,
            borderColor: "border-indigo-500/60",
            badge: "IN DEV"
        },
        {
            name: "FutoraFinance AI",
            description: "Smart financial assistant & global wallet",
            category: "FINTECH",
            categoryColor: "text-emerald-400",
            icon: <Wallet className="w-5 h-5 text-emerald-400" />,
            borderColor: "border-emerald-500/60",
            badge: "IN DEV"
        },
        {
            name: "FutoraPulse",
            description: "AI-driven social insights & trend detection",
            category: "INSIGHTS",
            categoryColor: "text-violet-400",
            icon: <LineChart className="w-5 h-5 text-violet-400" />,
            borderColor: "border-violet-500/60",
            badge: "IN DEV"
        },
        {
            name: "FutoraTrust",
            description: "Internet trust engine for credibility scoring",
            category: "TRUST",
            categoryColor: "text-blue-400",
            icon: <ShieldCheck className="w-5 h-5 text-blue-400" />,
            borderColor: "border-blue-500/60",
            badge: "IN DEV"
        },
        {
            name: "FutoraCircle",
            description: "Private micro-communities for builders",
            category: "SOCIAL",
            categoryColor: "text-fuchsia-400",
            icon: <Users className="w-5 h-5 text-fuchsia-400" />,
            borderColor: "border-fuchsia-500/60",
            badge: "IN DEV"
        },
        {
            name: "FutoraID",
            description: "Decentralized digital identity & reputation",
            category: "IDENTITY",
            categoryColor: "text-teal-400",
            icon: <Fingerprint className="w-5 h-5 text-teal-400" />,
            borderColor: "border-teal-500/60",
            badge: "IN DEV"
        }
    ];

    return (
        <div className="min-h-screen bg-black text-white selection:bg-primary/30">
            {/* Solid Stealth Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-black">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[150px] opacity-20" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[150px] opacity-20" />
                <div className="absolute inset-0 bg-[#020202]" />
            </div>

            <header className="sticky top-0 z-50 px-6 py-4 border-b border-white/5 bg-black/80 backdrop-blur-3xl">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <Button
                        variant="ghost"
                        onClick={() => navigate("/explore")}
                        className="text-[10px] font-black tracking-[0.2em] uppercase text-white/30 hover:text-white hover:bg-white/5 rounded-full px-5 transition-all"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 mr-2" />
                        Explore
                    </Button>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black tracking-[0.3em] text-white/50 uppercase">Futora Group</span>
                    </div>
                </div>
            </header>

            <main className="relative z-10 max-w-6xl mx-auto px-6 py-12 md:py-20 lg:py-28">
                <div className="text-center mb-24">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-32 h-32 mx-auto mb-8 relative"
                    >
                        <div className="absolute inset-0 bg-cyan-500/20 blur-[50px] rounded-full animate-pulse-slow" />
                        <img src="/futora-phoenix.png" alt="Futora Phoenix" className="w-full h-full object-contain relative z-10 drop-shadow-2xl" />
                    </motion.div>

                    <h1 className="text-5xl md:text-8xl font-black mb-4 tracking-tighter text-white">
                        Futora <span className="text-cyan-400">Group</span>
                    </h1>

                    <a
                        href="https://futoragroup.in"
                        target="_blank"
                        rel="noreferrer"
                        className="mb-12 inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs px-6 py-2.5 rounded-full shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_50px_rgba(6,182,212,0.5)] hover:scale-105 transition-all duration-300 uppercase tracking-widest relative z-50 cursor-pointer"
                    >
                        futoragroup.in <ArrowUpRight className="w-4 h-4 ml-0.5" />
                    </a>

                    <p className="text-white/40 text-xs md:text-sm max-w-xl mx-auto font-medium tracking-wide leading-relaxed uppercase">
                        Explore Our All Platforms
                    </p>
                </div>

                {/* Main Platforms Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-24">
                    {platforms.map((platform, index) => (
                        <motion.div
                            key={platform.name}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1, duration: 0.6 }}
                        >
                            <Card
                                className={cn(
                                    "h-full bg-[#0A0A0A] border border-white/10 hover:border-white/20 transition-all duration-300 overflow-hidden cursor-pointer shadow-2xl relative flex flex-col group",
                                    platform.border
                                )}
                                onClick={() => platform.url !== "#" && window.open(platform.url, '_blank')}
                            >
                                {/* Top Gradient Border */}
                                <div className={cn("h-1 w-full bg-gradient-to-r opacity-80", platform.color)} />

                                {/* Inner Glow */}
                                <div className={cn("absolute inset-0 bg-gradient-to-b opacity-[0.02] group-hover:opacity-[0.05] transition-opacity duration-500", platform.color)} />

                                {/* Content Section */}
                                <CardContent className="p-6 pb-28 flex flex-col items-start text-left h-full relative z-10 w-full">
                                    <div className="mb-5 p-3 bg-white/[0.03] rounded-xl border border-white/5 shadow-xl group-hover:scale-105 transition-transform duration-500">
                                        {platform.icon}
                                    </div>

                                    <div className="space-y-2 flex-1 w-full">
                                        <h3 className="text-xl font-black text-white tracking-tight">{platform.name}</h3>
                                        <p className={cn("text-[9px] font-bold uppercase tracking-[0.2em]", platform.name === "Futora Finance" ? "text-emerald-400" : "text-white/40")}>
                                            {platform.tagline}
                                        </p>
                                        <p className="text-white/40 text-xs leading-relaxed font-medium pt-1 max-w-sm line-clamp-3">
                                            {platform.description}
                                        </p>
                                    </div>

                                    {/* Bottom Button Section */}
                                    <div className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-black via-black/95 to-transparent pt-10">
                                        {platform.name === "Futora Finance" ? (
                                            <div className="flex items-center gap-2 w-full">
                                                <Button
                                                    className="flex-1 bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/50 text-white font-bold h-10 rounded-lg text-[10px] uppercase tracking-wide transition-all"
                                                    onClick={(e) => { e.stopPropagation(); window.open("https://futorapay.vercel.app/", "_blank"); }}
                                                >
                                                    Wallet <ArrowUpRight className="w-3 h-3 ml-1" />
                                                </Button>
                                                <Button
                                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 rounded-lg text-[10px] uppercase tracking-wide transition-all shadow-lg shadow-emerald-900/20"
                                                    onClick={(e) => { e.stopPropagation(); window.open("https://futorapay.vercel.app/", "_blank"); }}
                                                >
                                                    Pay <ArrowUpRight className="w-3 h-3 ml-1" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                className={cn(
                                                    "w-full font-bold h-10 rounded-lg text-white shadow-xl transition-all hover:scale-[1.02] text-xs",
                                                    platform.name === "FutoraLift" ? "bg-blue-600 hover:bg-blue-500 shadow-blue-900/20" :
                                                        platform.name === "FutoraFlow" ? "bg-purple-600 hover:bg-purple-500 shadow-purple-900/20" :
                                                            platform.name === "Futora AI" ? "bg-amber-600 hover:bg-amber-500 shadow-amber-900/20" :
                                                                "bg-white/10 hover:bg-white/20"
                                                )}
                                            >
                                                {platform.cta} <ArrowUpRight className="w-3.5 h-3.5 ml-2" />
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Job Application CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-24 relative group overflow-hidden rounded-[2rem] border border-white/10"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 group-hover:opacity-100 opacity-50 transition-opacity duration-500" />
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />

                    <div className="relative z-10 px-8 py-12 md:p-16 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
                        <div className="space-y-4 max-w-xl">
                            <h2 className="text-3xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 tracking-tight">
                                Build the Future with Us
                            </h2>
                            <p className="text-white/40 font-medium text-sm leading-relaxed max-w-md mx-auto md:mx-0">
                                We're looking for visionaries, weirdos, and builders who want to shape the next era of AI and humanity.
                            </p>
                        </div>
                        <Button
                            className="bg-white text-black hover:bg-white/90 font-black text-sm px-10 py-7 rounded-full uppercase tracking-widest shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] hover:scale-105 transition-all duration-300"
                            onClick={() => window.open("https://forms.gle/iuJYka5rUbgsxYVNA", "_blank")}
                        >
                            Apply for Job <ArrowUpRight className="w-5 h-5 ml-2" />
                        </Button>
                    </div>
                </motion.div>

                {/* Upcoming Innovation Section */}
                <div className="mb-24">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tighter">Upcoming Innovation</h2>
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">In Dev • AI, Trust, Social & Growth Ecosystem</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {upcomingPlatforms.map((item, index) => (
                            <motion.div
                                key={item.name}
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card className={cn(
                                    "bg-[#050505] border-[1.5px] h-full aspect-[5/6] group relative overflow-hidden transition-all duration-300 hover:scale-[1.02] rounded-[1.5rem]",
                                    item.borderColor
                                )}>
                                    <CardContent className="p-5 flex flex-col items-center text-center h-full relative z-10 justify-between">
                                        {/* IN DEV Badge */}
                                        <div className="absolute top-4 right-4 bg-white/5 border border-white/5 px-2 py-0.5 rounded text-[8px] font-bold text-white/40 uppercase tracking-widest">
                                            {item.badge}
                                        </div>

                                        <div className="mt-3 mb-2 p-3 bg-white/[0.05] rounded-2xl border border-white/5 transition-colors duration-300">
                                            {item.icon}
                                        </div>

                                        <div className="flex-1 flex flex-col justify-center w-full">
                                            <h3 className="text-sm font-extrabold text-white mb-1.5 leading-tight tracking-tight">{item.name}</h3>
                                            <p className="text-white/40 text-[10px] font-medium leading-relaxed line-clamp-2 px-1">
                                                {item.description}
                                            </p>
                                        </div>

                                        <div className="mt-auto pb-1">
                                            <span className={cn("text-[9px] font-black uppercase tracking-[0.25em]", item.categoryColor)}>
                                                {item.category}
                                            </span>
                                        </div>
                                    </CardContent>

                                    {/* Static Glow */}
                                    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-5 transition-opacity duration-500 pointer-events-none",
                                        item.category === "AI" ? "from-cyan-500 to-blue-500" :
                                            item.category === "FINTECH" ? "from-emerald-500 to-green-500" :
                                                "from-white to-gray-500"
                                    )} />
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Futora Hub Architecture Banner */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="p-12 rounded-[2.5rem] bg-[#080808] border border-white/5 relative overflow-hidden text-center shadow-black shadow-2xl"
                >
                    <div className="relative z-10">
                        <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-6 opacity-80" />
                        <h3 className="text-2xl font-black mb-3 text-white">Unified Futora ID</h3>
                        <p className="text-muted-foreground max-w-lg mx-auto text-sm">
                            Your FutoraOne account works across the entire ecosystem. Zero friction. Total control.
                        </p>
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
                </motion.div>
            </main>
        </div>
    );
};

export default Ecosystem;
