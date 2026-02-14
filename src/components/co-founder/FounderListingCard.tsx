import { useState, memo } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, TrendingUp, DollarSign, Clock, Trash2, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ApplyFounderDialog } from "./ApplyFounderDialog";
import { ViewFounderApplicationsDialog } from "./ViewFounderApplicationsDialog";
import { EditFounderDialog } from "./EditFounderDialog";

export interface FounderListing {
    id: string;
    user_id: string;
    role_needed: string;
    idea_description: string;
    equity_range: string;
    stage: string;
    industry: string;
    location: string;
    created_at: string;
    profiles?: {
        full_name: string;
        avatar_url: string | null;
        username: string;
    };
}

interface FounderListingCardProps {
    listing: FounderListing;
    currentUserId: string | null;
    onDelete?: (id: string) => void;
    onUpdate?: () => void;
}

export const FounderListingCard = memo(({ listing, currentUserId, onDelete, onUpdate }: FounderListingCardProps) => {
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('founder_listings')
                .delete()
                .eq('id', listing.id);

            if (error) throw error;

            toast({
                title: "Listing Deleted",
                description: "Your listing has been removed from the marketplace.",
            });

            if (onDelete) onDelete(listing.id);
        } catch (error: any) {
            console.error("Error deleting listing:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to delete listing",
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
        }
    };
    return (
        <Card className="group relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 border border-primary/5 bg-background/40 backdrop-blur-md hover:border-primary/20">
            {/* Design accents */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors duration-500" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 blur-3xl -ml-12 -mb-12 group-hover:bg-primary/10 transition-colors duration-500" />

            <CardHeader className="pb-3 relative">
                <div className="flex justify-between items-start gap-4">
                    <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors border-none text-[10px] uppercase font-bold tracking-widest px-2 py-0.5">
                                {listing.industry}
                            </Badge>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80 font-medium">
                                <Clock className="w-3 h-3 text-primary/60" />
                                {new Date(listing.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </div>
                        </div>
                        <h3 className="text-xl font-black tracking-tight text-foreground/90 leading-tight group-hover:translate-x-1 transition-transform duration-300">
                            {listing.role_needed}
                        </h3>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        {currentUserId === listing.user_id && (
                            <div className="flex items-center gap-1">
                                <EditFounderDialog listing={listing} onUpdated={() => onUpdate?.()} />
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/50 hover:text-destructive hover:bg-destructive/10 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Listing?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will permanently remove your listing and all received applications. This action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        )}
                        <div className="relative">
                            <Avatar className="h-12 w-12 border-2 border-primary/10 ring-4 ring-primary/5 shadow-inner group-hover:scale-110 transition-all duration-500">
                                <AvatarImage src={listing.profiles?.avatar_url || undefined} className="object-cover" />
                                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/30 text-primary font-bold">
                                    {listing.profiles?.full_name?.[0] || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full shadow-sm animate-pulse" />
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pb-4 space-y-6 relative">
                <blockquote className="text-sm text-foreground/70 line-clamp-3 leading-relaxed font-medium italic border-l-2 border-primary/20 pl-3">
                    "{listing.idea_description}"
                </blockquote>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Compact Stats Row */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/5 border border-primary/5 text-primary">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-bold uppercase tracking-tight">{listing.stage}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/10 text-yellow-600 dark:text-yellow-500">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-bold uppercase tracking-tight">{listing.equity_range}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/10 text-blue-600 dark:text-blue-500">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-bold uppercase tracking-tight">{listing.location}</span>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="pt-2 pb-5 px-6 relative">
                <div className="w-full flex items-center gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                    {currentUserId === listing.user_id ? (
                        <ViewFounderApplicationsDialog
                            listingId={listing.id}
                            listingRole={listing.role_needed}
                        />
                    ) : (
                        <ApplyFounderDialog
                            listingId={listing.id}
                            listingRole={listing.role_needed}
                        />
                    )}
                </div>
            </CardFooter>
        </Card>
    );
});

FounderListingCard.displayName = "FounderListingCard";
