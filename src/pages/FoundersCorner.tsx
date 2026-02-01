import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FounderListing, FounderListingCard } from "@/components/co-founder/FounderListingCard";
import { CreateListingDialog } from "@/components/co-founder/CreateListingDialog";
import { AICofounderChat } from "@/components/co-founder/AICofounderChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Filter, Sparkles, Users, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { BottomNav } from "@/components/BottomNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";

const FoundersCorner = () => {
    const [listings, setListings] = useState<FounderListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeFilter, setActiveFilter] = useState("All");
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("listings");
    const navigate = useNavigate();
    const { toast } = useToast();

    const fetchListings = async () => {
        setLoading(true);
        try {
            // 1. Fetch listings
            const { data: listingsData, error: listingsError } = await supabase
                .from('founder_listings' as any)
                .select('*')
                .order('created_at', { ascending: false });

            if (listingsError) throw listingsError;

            if (!listingsData || listingsData.length === 0) {
                setListings([]);
                return;
            }

            // 2. Fetch profiles for these listings
            const userIds = [...new Set((listingsData as any[]).map(l => l.user_id))];
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, username, avatar_url')
                .in('id', userIds);

            if (profilesError) {
                console.error("Error fetching profiles:", profilesError);
            }

            // 3. Merge data
            const profilesMap = (profilesData || []).reduce((acc, profile) => {
                acc[profile.id] = profile;
                return acc;
            }, {} as Record<string, any>);

            const combinedListings = (listingsData as any[]).map(listing => ({
                ...listing,
                profiles: profilesMap[listing.user_id] || {
                    full_name: 'Unknown User',
                    username: 'unknown',
                    avatar_url: null
                }
            }));

            setListings(combinedListings as FounderListing[]);

        } catch (error: any) {
            console.error("Error in fetchListings:", error);
            setListings([]);
            toast({
                title: "Error loading listings",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUserId(user?.id || null);
        };
        fetchUser();
        fetchListings();
    }, []);

    const handleAiFilter = (filter: string) => {
        setActiveFilter(filter);
        setActiveTab("listings");
    };

    // Mock data deleted - now using real database listings

    const filteredListings = listings.filter(listing => {
        const matchesSearch =
            listing.role_needed.toLowerCase().includes(searchTerm.toLowerCase()) ||
            listing.idea_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            listing.industry.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilter = activeFilter === "All" || listing.industry === activeFilter;

        return matchesSearch && matchesFilter;
    });

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
                <div className="container max-w-2xl mx-auto p-4">
                    <div className="flex items-center gap-4 mb-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/explore')}>
                            <ArrowLeft className="w-6 h-6" />
                        </Button>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-pink-600 bg-clip-text text-transparent">
                                Founders Corner
                            </h1>
                            <p className="text-sm text-muted-foreground flex gap-2 items-center">
                                Find your perfect co-founder
                                <span className="text-xs px-2 py-0.5 bg-secondary rounded-full cursor-pointer hover:bg-secondary/80 text-foreground" onClick={() => navigate("/category/Founder's Corner")}>
                                    View Stories ↗
                                </span>
                            </p>
                        </div>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="listings" className="gap-2">
                                <Users className="w-4 h-4" /> Listings
                            </TabsTrigger>
                            <TabsTrigger value="ai-advisor" className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500/10 data-[state=active]:to-pink-600/10 data-[state=active]:text-pink-600">
                                <Bot className="w-4 h-4" /> AI Founder
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="listings" className="mt-4">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search roles, ideas..."
                                        className="pl-9 bg-secondary/50 border-0"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <CreateListingDialog onPostCreated={fetchListings} />
                            </div>

                            {/* Filters */}
                            <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
                                {["All", "Fintech", "Edtech", "AI/ML", "SaaS", "HealthTech", "Gaming"].map((filter) => (
                                    <Badge
                                        key={filter}
                                        variant={activeFilter === filter ? "default" : "outline"}
                                        className={`cursor-pointer whitespace-nowrap px-4 py-1.5 transition-all ${activeFilter === filter
                                            ? "bg-foreground text-background scale-105"
                                            : "hover:bg-secondary hover:scale-105"
                                            }`}
                                        onClick={() => setActiveFilter(filter)}
                                    >
                                        {filter}
                                    </Badge>
                                ))}
                            </div>

                            {/* Content */}
                            <div className="space-y-4 mt-4">
                                {loading ? (
                                    // Skeleton loading
                                    Array(3).fill(0).map((_, i) => (
                                        <div key={i} className="h-48 rounded-xl bg-muted/20 animate-pulse" />
                                    ))
                                ) : filteredListings.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="bg-muted/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Filter className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                        <h3 className="text-lg font-semibold">No listings found</h3>
                                        <p className="text-muted-foreground mb-6">Be the first to post a co-founder listing!</p>
                                        <CreateListingDialog onPostCreated={fetchListings} />
                                    </div>
                                ) : (
                                    <AnimatePresence>
                                        {filteredListings.map((listing, index) => (
                                            <motion.div
                                                key={listing.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -20 }}
                                                transition={{ delay: index * 0.1 }}
                                            >
                                                <FounderListingCard
                                                    listing={listing}
                                                    currentUserId={currentUserId}
                                                />
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="ai-advisor" className="mt-4">
                            <div className="bg-gradient-to-br from-orange-500/5 to-pink-600/5 rounded-xl border border-orange-200/20 p-1">
                                <div className="p-4 text-center space-y-2 mb-2">
                                    <div className="inline-flex items-center justify-center p-2 rounded-full bg-gradient-to-r from-orange-100 to-pink-100 mb-2">
                                        <Bot className="w-6 h-6 text-pink-600" />
                                    </div>
                                    <h2 className="text-xl font-bold">Your AI Co-Founder (Arya)</h2>
                                    <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                                        Ask for advice, get match suggestions, or validate your startup ideas.
                                    </p>
                                </div>
                                <AICofounderChat onApplyFilter={handleAiFilter} />
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            <BottomNav />
        </div>
    );
};

export default FoundersCorner;
