import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GigListing, GigCard } from "@/components/gigs/GigCard";
import { CreateGigDialog } from "@/components/gigs/CreateGigDialog";
import { MarketplaceFilterDrawer } from "@/components/marketplace/MarketplaceFilterDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Filter, Briefcase } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "../hooks/use-debounce";

// Mock data deleted - now using real database listings

const GigMarketplace = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [gigs, setGigs] = useState<GigListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
    const debouncedSearch = useDebounce(searchTerm, 500);

    const [filters, setFilters] = useState({
        category: searchParams.getAll("category"),
        priceRange: searchParams.getAll("priceRange"),
        location: searchParams.getAll("location")
    });

    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const navigate = useNavigate();
    const { toast } = useToast();

    const fetchGigs = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('gig_listings')
                .select('*');

            // Search (case-insensitive)
            if (debouncedSearch) {
                query = query.or(`title.ilike.%${debouncedSearch}%,description.ilike.%${debouncedSearch}%`);
            }

            // Category filter (using skills_required as proxy)
            if (filters.category.length > 0) {
                query = query.overlaps('skills_required', filters.category);
            }

            // Location filter
            if (filters.location.length > 0) {
                query = query.in('location', filters.location);
            }

            // Price filtering
            if (filters.priceRange.length > 0) {
                const priceFilters: string[] = [];
                filters.priceRange.forEach(range => {
                    if (range === "< ₹500") priceFilters.push("price.lt.500");
                    if (range === "₹500 - ₹2000") priceFilters.push("and(price.gte.500,price.lte.2000)");
                    if (range === "₹2000 - ₹5000") priceFilters.push("and(price.gte.2000,price.lte.5000)");
                    if (range === "₹5000+") priceFilters.push("price.gt.5000");
                });
                if (priceFilters.length > 0) {
                    query = query.or(priceFilters.join(','));
                }
            }

            const { data: gigsData, error: gigsError } = await query.order('created_at', { ascending: false });

            if (gigsError) throw gigsError;

            if (!gigsData || gigsData.length === 0) {
                setGigs([]);
                return;
            }

            // 2. Fetch profiles for these gigs manually to avoid join issues
            // Explicitly cast to any[] first because the table definition might be missing in generated types
            const rawGigs = gigsData as unknown as GigListing[];
            const userIds = [...new Set(rawGigs.map(g => g.user_id))];

            if (userIds.length === 0) {
                setGigs(rawGigs);
                return;
            }

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
            }, {} as Record<string, { full_name: string | null; username: string | null; avatar_url: string | null }>);

            const combinedGigs = rawGigs.map(gig => ({
                ...gig,
                profiles: profilesMap[gig.user_id] || {
                    full_name: 'Unknown User',
                    username: 'unknown',
                    avatar_url: null
                }
            }));

            setGigs(combinedGigs);

        } catch (error) {
            const err = error as Error;
            console.error("Error fetching gigs:", error);
            setGigs([]);
            toast({
                title: "Error",
                description: "Failed to load gigs. " + (error.message || ""),
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, filters, toast]);

    // Update URL when filters/search change
    useEffect(() => {
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("search", debouncedSearch);

        filters.category.forEach(v => params.append("category", v));
        filters.priceRange.forEach(v => params.append("priceRange", v));
        filters.location.forEach(v => params.append("location", v));

        setSearchParams(params, { replace: true });
        fetchGigs();

        // Subscribe to real-time updates
        const channel = supabase
            .channel('gig-listings-all')
            .on('postgres_changes' as any, { event: '*', table: 'gig_listings' }, () => {
                fetchGigs();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [debouncedSearch, filters, fetchGigs, setSearchParams]);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUserId(user?.id || null);
        };
        fetchUser();
    }, []);

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => {
            const current = (prev as Record<string, string[]>)[key] || [];
            const updated = current.includes(value)
                ? current.filter((v: string) => v !== value)
                : [...current, value];
            return { ...prev, [key]: updated };
        });
    };

    const handleResetFilters = () => {
        setFilters({
            category: [],
            priceRange: [],
            location: []
        });
        setSearchTerm("");
    };

    const filteredGigs = gigs;

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
                <div className="container max-w-2xl mx-auto p-4">
                    <div className="flex items-center gap-4 mb-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/explore')}>
                            <ArrowLeft className="w-6 h-6" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-500 to-green-600 bg-clip-text text-transparent flex items-center gap-2">
                                Gig Marketplace
                            </h1>
                            <p className="text-sm text-muted-foreground">Find micro-gigs & earn pocket money</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search React, Logo Design, etc..."
                                className="pl-9 bg-secondary/50 border-0"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <CreateGigDialog onGigCreated={fetchGigs} />
                    </div>

                    {/* Filters */}
                    <div className="flex items-center justify-between mt-4">
                        <div className="flex gap-2 items-center overflow-x-auto pb-2 scrollbar-hide flex-1">
                            <MarketplaceFilterDrawer
                                type="gig"
                                filters={filters}
                                onFilterChange={handleFilterChange}
                                onReset={handleResetFilters}
                            />
                            {(filters.category.length > 0 || filters.priceRange.length > 0 || filters.location.length > 0) && (
                                <div className="flex gap-1">
                                    {[...filters.category, ...filters.priceRange, ...filters.location].map(f => (
                                        <Badge key={f} variant="secondary" className="px-2 py-0.5 text-[10px]">
                                            {f}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container max-w-2xl mx-auto p-4 space-y-4">
                {loading ? (
                    // Skeleton loading
                    Array(3).fill(0).map((_, i) => (
                        <div key={i} className="h-40 rounded-xl bg-muted/20 animate-pulse" />
                    ))
                ) : filteredGigs.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="bg-muted/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Briefcase className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold">No gigs available yet</h3>
                        <p className="text-muted-foreground mb-6">Be the first to post a task!</p>
                        <CreateGigDialog onGigCreated={fetchGigs} />
                    </div>
                ) : (
                    filteredGigs.map((gig) => (
                        <GigCard
                            key={gig.id}
                            gig={gig}
                            currentUserId={currentUserId}
                            onDelete={(id) => setGigs(prev => prev.filter(g => g.id !== id))}
                            onUpdate={fetchGigs}
                        />
                    ))
                )}
            </div>

            <BottomNav />
        </div>
    );
};

export default GigMarketplace;
