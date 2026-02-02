import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, MapPin, Clock, DollarSign, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ViewGigApplicationsDialogProps {
    gigId: string;
    gigTitle: string;
}

export const ViewGigApplicationsDialog = ({ gigId, gigTitle }: ViewGigApplicationsDialogProps) => {
    const [open, setOpen] = useState(false);
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const fetchApplications = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('gig_applications' as any)
                .select('*, profiles:applicant_id(full_name, avatar_url, username)')
                .eq('gig_id', gigId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setApplications(data || []);
        } catch (error: any) {
            console.error("Error fetching applications:", error);
            toast({
                title: "Error",
                description: "Failed to load proposals.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) fetchApplications();
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2 border-yellow-500/30 text-yellow-600 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-900/10">
                    <FileText className="w-4 h-4" />
                    View Proposals
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-xl font-bold">Proposals for {gigTitle}</DialogTitle>
                    <DialogDescription>Review bids from specialists interested in this task.</DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden p-6 pt-2">
                    {loading ? (
                        <div className="space-y-4 py-8">
                            {[1, 2].map(i => (
                                <div key={i} className="h-32 rounded-xl bg-muted/20 animate-pulse" />
                            ))}
                        </div>
                    ) : applications.length === 0 ? (
                        <div className="py-12 text-center rounded-2xl bg-muted/20 border border-dashed border-border">
                            <User className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                            <h3 className="font-semibold text-lg">No proposals yet</h3>
                            <p className="text-muted-foreground mt-1 text-sm">
                                Your gig is live! Proposals will appear here soon.
                            </p>
                        </div>
                    ) : (
                        <ScrollArea className="h-full pr-4">
                            <div className="space-y-4">
                                {applications.map((app) => (
                                    <div key={app.id} className="p-4 rounded-xl border border-border bg-card hover:border-yellow-500/30 transition-colors">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10 border border-primary/10">
                                                    <AvatarImage src={app.profiles?.avatar_url} />
                                                    <AvatarFallback>{app.profiles?.full_name?.[0] || 'U'}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <h4 className="font-bold text-sm leading-tight">{app.profiles?.full_name}</h4>
                                                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">@{app.profiles?.username}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-none font-black text-xs px-2.5 py-0.5">
                                                    ₹{app.bid_amount}
                                                </Badge>
                                                <div className="flex items-center gap-1 text-[9px] text-muted-foreground font-bold mt-1 uppercase">
                                                    <Clock className="w-2.5 h-2.5" />
                                                    {app.expected_timeline}
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-sm text-foreground/80 bg-muted/30 p-3 rounded-lg border border-border/50 leading-relaxed italic">
                                            "{app.proposal}"
                                        </p>

                                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                                            <div className="text-[9px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-1">
                                                Sent on {new Date(app.created_at).toLocaleDateString()}
                                            </div>
                                            <Badge variant="outline" className="text-[9px] uppercase tracking-tighter border-yellow-500/20 text-yellow-600">
                                                Pending Review
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
