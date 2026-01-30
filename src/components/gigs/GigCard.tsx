import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ApplyGigDialog } from "./ApplyGigDialog";
import { ViewGigApplicationsDialog } from "./ViewGigApplicationsDialog";

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
}

export const GigCard = ({ gig, currentUserId }: GigCardProps) => {
    return (
        <Card className="hover:shadow-lg transition-shadow border-2 border-transparent hover:border-yellow-500/20 group">
            <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-yellow-100 dark:border-yellow-900/30">
                            <AvatarImage src={gig.profiles?.avatar_url || undefined} />
                            <AvatarFallback>{gig.profiles?.full_name?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h3 className="font-bold text-lg leading-tight group-hover:text-yellow-600 transition-colors">{gig.title}</h3>
                            <p className="text-xs text-muted-foreground">Posted by {gig.profiles?.full_name}</p>
                        </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800 text-sm font-bold px-3 py-1">
                        ₹{gig.price}
                    </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{gig.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                    {gig.skills_required?.slice(0, 3).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                    ))}
                    {gig.skills_required?.length > 3 && (
                        <Badge variant="outline" className="text-xs">+{gig.skills_required.length - 3}</Badge>
                    )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1"><MapPin className="w-3 h-3" />{gig.location}</div>
                    <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(gig.created_at).toLocaleDateString()}</div>
                </div>
            </CardContent>
            <CardFooter className="pt-0 pb-4">
                {currentUserId === gig.user_id ? (
                    <ViewGigApplicationsDialog gigId={gig.id} gigTitle={gig.title} />
                ) : (
                    <ApplyGigDialog gigId={gig.id} gigTitle={gig.title} gigBudget={gig.price} />
                )}
            </CardFooter>
        </Card>
    );
};
