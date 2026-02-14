import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, FileText, Trash2, Loader2 } from "lucide-react";
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
import { ApplyGigDialog } from "./ApplyGigDialog";
import { ViewGigApplicationsDialog } from "./ViewGigApplicationsDialog";
import { EditGigDialog } from "./EditGigDialog";
import { useState, memo } from "react";

export interface GigListing {
    id: string;
    user_id: string;
    title: string;
    description: string;
    price: number;
    currency: string;
    status: string;
    location: string;
    skills_required: string[];
    created_at: string;
    profiles?: {
        full_name: string;
        avatar_url: string | null;
        username: string;
    };
}

interface GigCardProps {
    gig: GigListing;
    currentUserId: string | null;
    onDelete?: (id: string) => void;
    onUpdate?: () => void;
}

export const GigCard = memo(({ gig, currentUserId, onDelete, onUpdate }: GigCardProps) => {
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('gig_listings')
                .delete()
                .eq('id', gig.id);

            if (error) throw error;

            toast({
                title: "Gig Deleted",
                description: "Your gig has been removed from the marketplace.",
            });

            if (onDelete) onDelete(gig.id);
        } catch (error: any) {
            console.error("Error deleting gig:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to delete gig",
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
        }
    };
    return (
        <Card className="group relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-yellow-500/10 border border-primary/10 bg-background/50 backdrop-blur-xl hover:border-yellow-500/30">
            {/* Glossy background glow */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-500/10 blur-[80px] -mr-20 -mt-20 group-hover:bg-yellow-500/20 transition-all duration-700" />

            <CardContent className="pt-7 relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-yellow-400/20 blur-lg rounded-full group-hover:bg-yellow-400/40 transition-all duration-500" />
                            <Avatar className="h-14 w-14 border-2 border-background shadow-xl ring-2 ring-yellow-500/20 group-hover:scale-105 transition-transform duration-500 relative z-10">
                                <AvatarImage src={gig.profiles?.avatar_url || undefined} className="object-cover" />
                                <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-black text-lg">
                                    {gig.profiles?.full_name?.[0] || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-background rounded-full shadow-lg z-20" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-extrabold text-xl leading-tight text-foreground/90 group-hover:text-yellow-600 transition-colors duration-300">
                                {gig.title}
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-60">
                                    BY {gig.profiles?.full_name}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold">
                                    <Clock className="w-3.5 h-3.5 text-yellow-600/70" />
                                    {new Date(gig.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                        {currentUserId === gig.user_id && (
                            <div className="flex items-center gap-1 mb-1">
                                <EditGigDialog gig={gig} onGigUpdated={() => onUpdate?.()} />
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/50 hover:text-destructive hover:bg-destructive/10 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Gig?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will permanently remove your gig and all received proposals. This action cannot be undone.
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
                        <div className="relative group/price">
                            <div className="absolute inset-0 bg-green-500/20 blur-md rounded-full opacity-0 group-hover/price:opacity-100 transition-opacity" />
                            <div className="bg-background/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-green-500/20 shadow-lg flex flex-col items-center justify-center relative z-10">
                                <span className="text-lg font-black text-green-600 dark:text-green-400 leading-none">₹{gig.price}</span>
                                <span className="text-[9px] font-black text-green-600/40 uppercase tracking-tighter mt-1">{gig.currency}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="min-h-[3rem] mb-6">
                    <p className="text-sm text-foreground/80 line-clamp-2 leading-relaxed font-semibold opacity-90">
                        {gig.description}
                    </p>
                </div>

                <div className="flex flex-wrap gap-2.5 mb-8">
                    {gig.skills_required?.slice(0, 4).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-[10px] bg-secondary/80 hover:bg-yellow-500/10 hover:text-yellow-700 transition-colors text-foreground/70 border-none px-3 py-1 font-bold">
                            {skill}
                        </Badge>
                    ))}
                    {gig.skills_required?.length > 4 && (
                        <Badge variant="outline" className="text-[10px] px-2.5 py-1 border-primary/10 font-black opacity-60">+{gig.skills_required.length - 4}</Badge>
                    )}
                </div>

                <div className="flex items-center justify-between border-t border-primary/5 pt-5">
                    <div className="flex items-center gap-5">
                        <div className="flex items-center gap-2 text-[11px] font-black text-muted-foreground/50 uppercase tracking-widest">
                            <MapPin className="w-4 h-4 text-blue-500/70" />
                            {gig.location}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-green-500/80">
                            {gig.status}
                        </span>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="pt-2 pb-6 px-7 relative z-10">
                <div className="w-full transition-all duration-500 transform group-hover:-translate-y-1">
                    {currentUserId === gig.user_id ? (
                        <ViewGigApplicationsDialog gigId={gig.id} gigTitle={gig.title} />
                    ) : (
                        <ApplyGigDialog gigId={gig.id} gigTitle={gig.title} gigBudget={gig.price} />
                    )}
                </div>
            </CardFooter>

            {/* Subtle bottom shine */}
            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-yellow-400/10 to-transparent" />
        </Card>
    );
});

GigCard.displayName = "GigCard";
