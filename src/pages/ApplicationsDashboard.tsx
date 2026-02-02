import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, Users, ArrowRight, Clock, MapPin, DollarSign, Send, Inbox, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BottomNav } from "@/components/BottomNav";

const ApplicationsDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [receivedApps, setReceivedApps] = useState<{ gigs: any[], founders: any[] }>({ gigs: [], founders: [] });
    const [sentApps, setSentApps] = useState<{ gigs: any[], founders: any[] }>({ gigs: [], founders: [] });
    const navigate = useNavigate();

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Sent Applications (Gigs)
            const { data: sentGigs } = await supabase
                .from('gig_applications' as any)
                .select('*, gig_listings(title, price, currency, user_id)')
                .eq('applicant_id', user.id);

            // 2. Fetch Sent Applications (Founders)
            const { data: sentFounders } = await supabase
                .from('founder_applications' as any)
                .select('*, founder_listings(role_needed, industry, user_id)')
                .eq('applicant_id', user.id);

            // 3. Fetch Received Applications (Owner side)
            // Gigs owned by me
            const { data: myGigs } = await supabase
                .from('gig_listings' as any)
                .select('id')
                .eq('user_id', user.id);

            const myGigIds = myGigs?.map(g => g.id) || [];
            const { data: receivedGigs } = await supabase
                .from('gig_applications' as any)
                .select('*, gig_listings(title), profiles:applicant_id(full_name, avatar_url)')
                .in('gig_id', myGigIds);

            // Founder listings owned by me
            const { data: myListings } = await supabase
                .from('founder_listings' as any)
                .select('id')
                .eq('user_id', user.id);

            const myListIds = myListings?.map(l => l.id) || [];
            const { data: receivedFounders } = await supabase
                .from('founder_applications' as any)
                .select('*, founder_listings(role_needed), profiles:applicant_id(full_name, avatar_url)')
                .in('listing_id', myListIds);

            setSentApps({ gigs: sentGigs || [], founders: sentFounders || [] });
            setReceivedApps({ gigs: receivedGigs || [], founders: receivedFounders || [] });

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Subscribe to all relevant tables to keep dashboard updated in real-time
        const gigAppsChannel = supabase.channel('gig-apps-dashboard')
            .on('postgres_changes' as any, { event: '*', table: 'gig_applications' }, () => fetchData())
            .subscribe();

        const founderAppsChannel = supabase.channel('founder-apps-dashboard')
            .on('postgres_changes' as any, { event: '*', table: 'founder_applications' }, () => fetchData())
            .subscribe();

        const gigsChannel = supabase.channel('gigs-dashboard-sync')
            .on('postgres_changes' as any, { event: '*', table: 'gig_listings' }, () => fetchData())
            .subscribe();

        return () => {
            supabase.removeChannel(gigAppsChannel);
            supabase.removeChannel(founderAppsChannel);
            supabase.removeChannel(gigsChannel);
        };
    }, []);

    const EmptyState = ({ type }: { type: 'sent' | 'received' }) => (
        <div className="py-16 text-center bg-background/40 backdrop-blur-md rounded-2xl border border-dashed border-border/50">
            {type === 'sent' ? <Send className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" /> : <Inbox className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />}
            <h3 className="text-xl font-bold">No {type} items found</h3>
            <p className="text-muted-foreground max-w-xs mx-auto mt-2 italic">
                {type === 'sent' ? "You haven't applied to any opportunities yet." : "You haven't received any applications for your listings."}
            </p>
            <Button variant="outline" className="mt-6 gap-2" onClick={() => navigate('/explore')}>
                Explore Marketplace <ArrowRight className="w-4 h-4" />
            </Button>
        </div>
    );

    return (
        <div className="min-h-screen bg-background pb-20">
            <div className="container max-w-4xl mx-auto p-4 md:p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            Applications Hub
                        </h1>
                        <p className="text-muted-foreground font-medium">Manage your requests and track progress</p>
                    </div>
                </div>

                <Tabs defaultValue="received" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-8 p-1 bg-secondary/30 rounded-xl h-12">
                        <TabsTrigger value="received" className="rounded-lg font-bold transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <Inbox className="w-4 h-4 mr-2" /> Received
                        </TabsTrigger>
                        <TabsTrigger value="sent" className="rounded-lg font-bold transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            <Send className="w-4 h-4 mr-2" /> Sent
                        </TabsTrigger>
                    </TabsList>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="w-10 h-10 animate-spin text-primary" />
                            <p className="text-muted-foreground font-black uppercase tracking-widest text-[10px]">Syncing with Supabase...</p>
                        </div>
                    ) : (
                        <>
                            <TabsContent value="received" className="space-y-6">
                                {receivedApps.gigs.length === 0 && receivedApps.founders.length === 0 ? (
                                    <EmptyState type="received" />
                                ) : (
                                    <div className="grid gap-6">
                                        {/* Gigs Received */}
                                        {receivedApps.gigs.length > 0 && (
                                            <section className="space-y-4">
                                                <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                                                    <Briefcase className="w-4 h-4" /> Gig Proposals
                                                </h2>
                                                <div className="grid sm:grid-cols-2 gap-4">
                                                    {receivedApps.gigs.map(app => (
                                                        <Card key={app.id} className="border-primary/5 bg-background/50 hover:border-yellow-500/30 transition-all group shadow-sm">
                                                            <CardHeader className="pb-3">
                                                                <div className="flex justify-between items-start">
                                                                    <div className="flex items-center gap-3">
                                                                        <Avatar className="h-10 w-10 border border-primary/10">
                                                                            <AvatarFallback>{app.profiles?.full_name?.[0]}</AvatarFallback>
                                                                        </Avatar>
                                                                        <div>
                                                                            <CardTitle className="text-sm font-bold">{app.profiles?.full_name}</CardTitle>
                                                                            <CardDescription className="text-[10px] font-black uppercase">{app.gig_listings?.title}</CardDescription>
                                                                        </div>
                                                                    </div>
                                                                    <Badge className="bg-green-500/10 text-green-600 border-none font-black text-[10px]">₹{app.bid_amount}</Badge>
                                                                </div>
                                                            </CardHeader>
                                                            <CardFooter className="pt-0 pb-4 px-6 flex justify-between items-center">
                                                                <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-50">{new Date(app.created_at).toLocaleDateString()}</span>
                                                                <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-black tracking-widest hover:text-yellow-600" onClick={() => navigate('/gigs')}>View Gig ↗</Button>
                                                            </CardFooter>
                                                        </Card>
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        {/* Founders Received */}
                                        {receivedApps.founders.length > 0 && (
                                            <section className="space-y-4">
                                                <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                                                    <Users className="w-4 h-4" /> Founder Requests
                                                </h2>
                                                <div className="grid sm:grid-cols-2 gap-4">
                                                    {receivedApps.founders.map(app => (
                                                        <Card key={app.id} className="border-primary/5 bg-background/50 hover:border-primary/30 transition-all group shadow-sm">
                                                            <CardHeader className="pb-3">
                                                                <div className="flex justify-between items-start">
                                                                    <div className="flex items-center gap-3">
                                                                        <Avatar className="h-10 w-10 border border-primary/10">
                                                                            <AvatarFallback>{app.profiles?.full_name?.[0]}</AvatarFallback>
                                                                        </Avatar>
                                                                        <div>
                                                                            <CardTitle className="text-sm font-bold">{app.profiles?.full_name}</CardTitle>
                                                                            <CardDescription className="text-[10px] font-black uppercase">Role: {app.founder_listings?.role_needed}</CardDescription>
                                                                        </div>
                                                                    </div>
                                                                    <Badge variant="outline" className="border-primary/20 text-primary text-[9px] font-black uppercase">{app.status}</Badge>
                                                                </div>
                                                            </CardHeader>
                                                            <CardFooter className="pt-0 pb-4 px-6 flex justify-between items-center">
                                                                <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-50">{new Date(app.created_at).toLocaleDateString()}</span>
                                                                <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-black tracking-widest hover:text-primary" onClick={() => navigate('/co-founder')}>Manage ↗</Button>
                                                            </CardFooter>
                                                        </Card>
                                                    ))}
                                                </div>
                                            </section>
                                        )}
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="sent" className="space-y-6">
                                {sentApps.gigs.length === 0 && sentApps.founders.length === 0 ? (
                                    <EmptyState type="sent" />
                                ) : (
                                    <div className="grid gap-6">
                                        {/* My Gig Applications */}
                                        {sentApps.gigs.length > 0 && (
                                            <section className="space-y-4">
                                                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground/50">My Gig Proposals</h2>
                                                <div className="grid sm:grid-cols-2 gap-4">
                                                    {sentApps.gigs.map(app => (
                                                        <Card key={app.id} className="border-primary/5 bg-secondary/10 hover:border-yellow-500/30 transition-all group">
                                                            <CardHeader className="pb-3">
                                                                <CardTitle className="text-base font-bold">{app.gig_listings?.title || 'Unknown Gig'}</CardTitle>
                                                                <CardDescription className="text-xs line-clamp-1">{app.proposal}</CardDescription>
                                                            </CardHeader>
                                                            <CardContent className="pb-3 pt-0">
                                                                <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground">
                                                                    <div className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> ₹{app.bid_amount}</div>
                                                                    <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {app.expected_timeline}</div>
                                                                </div>
                                                            </CardContent>
                                                            <CardFooter className="border-t border-primary/5 pt-3 pb-3 flex justify-between items-center">
                                                                <Badge className="bg-yellow-500 text-white border-none font-black text-[9px] uppercase">{app.status}</Badge>
                                                                <span className="text-[9px] font-bold text-muted-foreground uppercase">{new Date(app.created_at).toLocaleDateString()}</span>
                                                            </CardFooter>
                                                        </Card>
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        {/* My Founder Applications */}
                                        {sentApps.founders.length > 0 && (
                                            <section className="space-y-4">
                                                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground/50">My Founder Requests</h2>
                                                <div className="grid sm:grid-cols-2 gap-4">
                                                    {sentApps.founders.map(app => (
                                                        <Card key={app.id} className="border-primary/5 bg-secondary/10 hover:border-primary/30 transition-all group">
                                                            <CardHeader className="pb-3">
                                                                <CardTitle className="text-base font-bold">Applying for {app.founder_listings?.role_needed || 'Founder Role'}</CardTitle>
                                                                <CardDescription className="text-xs line-clamp-1 italic">"{app.message}"</CardDescription>
                                                            </CardHeader>
                                                            <CardFooter className="border-t border-primary/5 pt-3 pb-3 flex justify-between items-center">
                                                                <Badge className="bg-primary text-white border-none font-black text-[9px] uppercase">{app.status}</Badge>
                                                                <span className="text-[9px] font-bold text-muted-foreground uppercase">{new Date(app.created_at).toLocaleDateString()}</span>
                                                            </CardFooter>
                                                        </Card>
                                                    ))}
                                                </div>
                                            </section>
                                        )}
                                    </div>
                                )}
                            </TabsContent>
                        </>
                    )}
                </Tabs>
            </div>
            <BottomNav />
        </div>
    );
};

export default ApplicationsDashboard;