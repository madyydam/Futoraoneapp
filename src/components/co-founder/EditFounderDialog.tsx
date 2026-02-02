import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Pencil, Rocket } from "lucide-react";

interface EditFounderForm {
    role_needed: string;
    idea_description: string;
    equity_range: string;
    stage: string;
    industry: string;
    location: string;
}

interface EditFounderDialogProps {
    listing: {
        id: string;
        role_needed: string;
        idea_description: string;
        equity_range: string;
        stage: string;
        industry: string;
        location: string;
    };
    onUpdated: () => void;
}

export const EditFounderDialog = ({ listing, onUpdated }: EditFounderDialogProps) => {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const { register, handleSubmit, reset, setValue } = useForm<EditFounderForm>({
        defaultValues: {
            role_needed: listing.role_needed,
            idea_description: listing.idea_description,
            equity_range: listing.equity_range,
            stage: listing.stage,
            industry: listing.industry,
            location: listing.location
        }
    });

    useEffect(() => {
        if (open) {
            reset({
                role_needed: listing.role_needed,
                idea_description: listing.idea_description,
                equity_range: listing.equity_range,
                stage: listing.stage,
                industry: listing.industry,
                location: listing.location
            });
        }
    }, [open, listing, reset]);

    const onSubmit = async (data: EditFounderForm) => {
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('founder_listings' as any)
                .update({
                    role_needed: data.role_needed,
                    idea_description: data.idea_description,
                    industry: data.industry,
                    stage: data.stage,
                    equity_range: data.equity_range,
                    location: data.location
                })
                .eq('id', listing.id);

            if (error) throw error;

            toast({
                title: "Listing Updated! 🚀",
                description: "Your co-founder search has been refreshed.",
            });

            setOpen(false);
            onUpdated();
        } catch (error: any) {
            console.error("Error updating listing:", error);
            toast({
                title: "Update failed",
                description: error.message || "Something went wrong",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors">
                    <Pencil className="w-4 h-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <Rocket className="w-6 h-6 text-orange-500" />
                        Edit Co-Founder Listing
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="role">Role Needed</Label>
                        <Input
                            id="role"
                            {...register("role_needed", { required: true })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="industry">Industry</Label>
                        <Select defaultValue={listing.industry} onValueChange={(val) => setValue("industry", val)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Industry" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Fintech">Fintech</SelectItem>
                                <SelectItem value="Edtech">Edtech</SelectItem>
                                <SelectItem value="Healthtech">Healthtech</SelectItem>
                                <SelectItem value="AI/ML">AI/ML</SelectItem>
                                <SelectItem value="E-commerce">E-commerce</SelectItem>
                                <SelectItem value="SaaS">SaaS</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="stage">Startup Stage</Label>
                        <Select defaultValue={listing.stage} onValueChange={(val) => setValue("stage", val)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Current Stage" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Idea Phase">Idea Phase</SelectItem>
                                <SelectItem value="Prototype/MVP">Prototype/MVP</SelectItem>
                                <SelectItem value="Early Revenue">Early Revenue</SelectItem>
                                <SelectItem value="Growth">Growth</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="equity">Equity Range</Label>
                        <Input
                            id="equity"
                            {...register("equity_range", { required: true })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                            id="location"
                            {...register("location", { required: true })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">The Pitch (Idea)</Label>
                        <Textarea
                            id="description"
                            className="h-32"
                            {...register("idea_description", { required: true })}
                        />
                    </div>

                    <Button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-pink-600 text-white font-bold" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            "Save Changes"
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};
