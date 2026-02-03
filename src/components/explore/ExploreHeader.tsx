import { memo } from "react";
import { motion } from "framer-motion";
import { Search, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";

export interface UserProfile {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    is_verified?: boolean | null;
}

export interface SearchResult {
    id: string;
    type: 'person' | 'project' | 'topic';
    title: string;
    subtitle: string;
    image?: string | null;
    is_verified?: boolean | null;
    meta?: string;
}

interface ExploreHeaderProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    handleSearch: (e: React.FormEvent) => void;
    setShowResults: (show: boolean) => void;
    searchLoading: boolean;
    showResults: boolean;
    searchResults: SearchResult[];
    handleUserClick: (userId: string) => void;
    onEcosystemClick: () => void;
}

export const ExploreHeader = memo(({
    searchQuery,
    setSearchQuery,
    handleSearch,
    setShowResults,
    searchLoading,
    showResults,
    searchResults,
    handleUserClick,
    onEcosystemClick
}: ExploreHeaderProps) => {
    return (
        <motion.div
            className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border p-4 shadow-sm"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
        >
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold gradient-text">Explore</h1>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onEcosystemClick}
                        className="rounded-full bg-[#0A0A0A] border-white/10 hover:border-white/20 text-white/90 font-black text-[10px] gap-2 transition-all hover:bg-black active:scale-95 uppercase tracking-[0.2em] shadow-2xl"
                    >
                        <Globe className="w-3 h-3 text-primary" />
                        Ecosystem
                    </Button>
                </div>
                <form onSubmit={handleSearch} className="relative">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors z-10" size={20} />
                        <Input
                            type="text"
                            placeholder="Search projects, topics, people..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => searchQuery && setShowResults(true)}
                            className="pl-12 pr-4 h-12 bg-background/50 border-2 border-border focus:border-primary transition-all rounded-2xl shadow-sm"
                        />
                        {searchLoading && (
                            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                                <motion.div
                                    className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Search Results Dropdown */}
                    {showResults && searchResults.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute top-full mt-2 w-full bg-card/95 backdrop-blur-lg border border-border rounded-2xl shadow-2xl overflow-hidden z-50"
                        >
                            <div className="p-2 space-y-1">
                                {searchResults.map((result, index) => (
                                    <motion.div
                                        key={`${result.type}-${result.id}`}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        onClick={() => result.type === 'person' && handleUserClick(result.id)}
                                        className="p-3 hover:bg-primary/5 hover:backdrop-blur-md rounded-xl cursor-pointer transition-all flex items-center gap-4 group"
                                    >
                                        <div className="relative">
                                            {result.type === 'person' ? (
                                                <Avatar className="h-11 w-11 ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all">
                                                    <AvatarImage src={result.image || undefined} />
                                                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 font-bold">
                                                        {result.title[0]?.toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                            ) : result.type === 'topic' ? (
                                                <div className="h-11 w-11 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500/20 transition-all">
                                                    <span className="text-blue-500 font-bold text-lg">#</span>
                                                </div>
                                            ) : (
                                                <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary/20 transition-all">
                                                    <Globe className="w-5 h-5 text-primary" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className="font-bold text-[14px] text-foreground truncate flex items-center gap-1.5 uppercase tracking-tight">
                                                    {result.title}
                                                    {result.type === 'person' && <VerifiedBadge isVerified={result.is_verified} size={14} />}
                                                </p>
                                                {result.meta && (
                                                    <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">{result.meta}</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground/70 truncate font-medium">
                                                {result.type === 'person' ? `@${result.subtitle}` : result.subtitle}
                                            </p>
                                        </div>

                                        <Search className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100" />
                                    </motion.div>
                                ))}
                            </div>
                            <div className="p-4 border-t border-border bg-muted/20 backdrop-blur-sm">
                                <button
                                    type="submit"
                                    className="w-full text-center text-[10px] text-primary hover:text-primary/80 font-bold uppercase tracking-[0.15em] transition-all"
                                >
                                    View all results for "{searchQuery}"
                                </button>
                            </div>
                        </motion.div>
                    )}
                </form>
            </div>
        </motion.div>
    );
});

ExploreHeader.displayName = "ExploreHeader";
