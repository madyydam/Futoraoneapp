import { useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Code, Cuboid as Cube, Sparkles, Clock } from "lucide-react";
import { motion } from "framer-motion";

import { FindDevsView } from "@/components/tech-match/FindDevsView";

const TechMatch = () => {
    const [activeTab, setActiveTab] = useState("find-devs");

    return (
        <div className="min-h-screen bg-background pb-20">
            <Tabs defaultValue="find-devs" className="w-full" onValueChange={setActiveTab}>
                {/* Floating Tabs Header */}
                <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b p-2 flex justify-center">
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="find-devs">
                            <Code className="w-4 h-4 mr-2" /> Find Devs
                        </TabsTrigger>
                        <TabsTrigger value="ai-companion" className="data-[state=active]:bg-pink-500 data-[state=active]:text-white">
                            <Cube className="w-4 h-4 mr-2" /> 3D Soulmate
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="find-devs">
                    <FindDevsView />
                </TabsContent>

                {/* 3D Soulmate - Coming Soon */}
                <TabsContent value="ai-companion" className="mt-0">
                    <div className="min-h-[calc(100dvh-130px)] bg-black flex items-center justify-center relative overflow-hidden">
                        {/* Animated background blobs */}
                        <div className="absolute inset-0 pointer-events-none">
                            <motion.div
                                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] bg-pink-600/25 rounded-full blur-[120px]"
                            />
                            <motion.div
                                animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.6, 0.3] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                                className="absolute bottom-[-15%] right-[-10%] w-[55%] h-[55%] bg-purple-600/25 rounded-full blur-[120px]"
                            />
                        </div>

                        {/* Content */}
                        <motion.div
                            initial={{ opacity: 0, y: 30, scale: 0.92 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className="relative z-10 text-center px-6 max-w-sm mx-auto"
                        >
                            {/* Pulsing icon */}
                            <motion.div
                                animate={{ scale: [1, 1.08, 1], rotate: [0, 5, -5, 0] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 backdrop-blur-md mb-8 shadow-[0_0_40px_rgba(236,72,153,0.3)]"
                            >
                                <Cube className="w-12 h-12 text-pink-400" />
                            </motion.div>

                            {/* Badge */}
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 mb-5">
                                <Clock className="w-3.5 h-3.5 text-pink-400" />
                                <span className="text-xs font-bold uppercase tracking-widest text-pink-400">Coming Soon</span>
                            </div>

                            <h2 className="text-3xl font-black text-white mb-3 leading-tight">
                                3D{" "}
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-purple-400">
                                    Soulmate
                                </span>
                            </h2>

                            <p className="text-gray-400 text-sm leading-relaxed mb-8">
                                Your AI companion in full 3D — real-time conversations, animated expressions, and personalized presence. We're building something extraordinary.
                            </p>

                            {/* Sparkles row */}
                            <div className="flex items-center justify-center gap-2 text-pink-500/40">
                                <Sparkles className="w-4 h-4" />
                                <span className="text-xs tracking-widest uppercase font-bold">In Development</span>
                                <Sparkles className="w-4 h-4" />
                            </div>
                        </motion.div>
                    </div>
                </TabsContent>
            </Tabs>

            <BottomNav />
        </div>
    );
};

export default TechMatch;
