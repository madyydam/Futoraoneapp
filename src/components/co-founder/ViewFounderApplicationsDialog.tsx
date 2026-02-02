import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquare, MapPin, Clock, Mail, User, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ViewFounderApplicationsDialogProps {
    listingId: string;
    listingRole: string;
}

export const ViewFounderApplicationsDialog = ({ listingId, listingRole }: ViewFounderApplicationsDialogProps) => {
    const [open, setOpen] = useState(false);
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const fetchApplications = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('founder_applications' as any)
                .select('*, profiles:applicant_id(full_name, avatar_url, username)')
                .eq('listing_id', listingId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setApplications(data || []);
        } catch (error: any) {
            console.error("Error fetching applications:", error);
            toast({
                title: "Error",
                description: "Failed to load applications.",
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
                <Button variant="outline" className="w-full gap-2 border-primary/20 text-primary hover:bg-primary/5">
                    <MessageSquare className="w-4 h-4" />
                    View Applications
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0 border-primary/10 shadow-2xl">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        Applications for {listingRole}
                    </DialogTitle>
                    <DialogDescription className="font-medium">Review potential co-founders who want to build with you.</DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden p-6 pt-2">
                    {loading ? (
                        <div className="space-y-4 py-8">
                            {[1, 2].map(i => (
                                <div key={i} className="h-32 rounded-xl bg-muted/20 animate-pulse" />
                            ))}
                        </div>
                    ) : applications.length === 0 ? (
                        <div className="py-12 text-center rounded-2xl bg-primary/5 border border-dashed border-primary/20">
                            <User className="w-12 h-12 mx-auto mb-3 text-primary opacity-30" />
                            <h3 className="font-bold text-lg">No one applied yet</h3>
                            <p className="text-muted-foreground mt-1 text-sm max-w-[250px] mx-auto">
                                Great things take time! Your listing is visible to the entire community.
                            </p>
                        </div>
                    ) : (
                        <ScrollArea className="h-full pr-4">
                            <div className="space-y-4">
                                {applications.map((app) => (
                                    <div key={app.id} className="p-5 rounded-2xl border border-primary/10 bg-gradient-to-br from-background to-primary/5 relative overflow-hidden group hover:border-primary/30 transition-all duration-300">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <Avatar className="h-12 w-12 border-2 border-background shadow-lg ring-2 ring-primary/10">
                                                        <AvatarImage src={app.profiles?.avatar_url} />
                                                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                                            {app.profiles?.full_name?.[0] || 'U'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full shadow-sm" />
                                                </div>
                                                <div>
                                                    <h4 className="font-extrabold text-base leading-tight">{app.profiles?.full_name}</h4>
                                                    <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">@{app.profiles?.username}</p>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-tighter bg-background/50 backdrop-blur-sm px-2 py-0.5 border-primary/10">
                                                Active Now
                                            </Badge>
                                        </div>

                                        <div className="bg-background/40 backdrop-blur-sm p-4 rounded-xl border border-primary/5 mb-4 shadow-sm group-hover:bg-background/60 transition-colors">
                                            <div className="flex items-start gap-2 mb-2">
                                                <Info className="w-3.5 h-3.5 text-primary/40 mt-0.5" />
                                                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">Interest Pitch</p>
                                            </div>
                                            <p className="text-sm text-foreground/90 leading-relaxed font-medium italic">
                                                "{app.message}"
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-primary/5">
                                            <div className="flex items-center gap-2 text-[10px] font-black text-primary/70 uppercase tracking-widest">
                                                <Mail className="w-3.5 h-3.5" />
                                                {app.contact_info}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-tight">
                                                Received {new Date(app.created_at).toLocaleDateString()}
                                            </div>
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
