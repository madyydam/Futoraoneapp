import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Pencil, Zap, Banknote } from "lucide-react";

interface EditGigForm {
    title: string;
    description: string;
    price: number;
    location: string;
    skills_input: string;
}

interface EditGigDialogProps {
    gig: {
        id: string;
        title: string;
        description: string;
        price: number;
        location: string;
        skills_required: string[];
    };
    onGigUpdated: () => void;
}

export const EditGigDialog = ({ gig, onGigUpdated }: EditGigDialogProps) => {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const { register, handleSubmit, reset } = useForm<EditGigForm>({
        defaultValues: {
            title: gig.title,
            description: gig.description,
            price: gig.price,
            location: gig.location,
            skills_input: gig.skills_required?.join(', ') || ""
        }
    });

    // Update defaults if gig prop changes
    useEffect(() => {
        if (open) {
            reset({
                title: gig.title,
                description: gig.description,
                price: gig.price,
                location: gig.location,
                skills_input: gig.skills_required?.join(', ') || ""
            });
        }
    }, [open, gig, reset]);

    const onSubmit = async (data: EditGigForm) => {
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('gig_listings' as any)
                .update({
                    title: data.title,
                    description: data.description,
                    price: Number(data.price),
                    location: data.location,
                    skills_required: data.skills_input.split(',').map(s => s.trim()).filter(s => s !== "")
                })
                .eq('id', gig.id);

            if (error) throw error;

            toast({ title: "Gig Updated! ✨", description: "Changes saved successfully." });
            setOpen(false);
            onGigUpdated();
        } catch (error: any) {
            console.error("Error updating gig:", error);
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
                <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/50 hover:text-yellow-600 hover:bg-yellow-500/10 transition-colors">
                    <Pencil className="w-4 h-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <Pencil className="w-6 h-6 text-yellow-500" /> Edit Your Gig
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Task Title</Label>
                        <Input id="title" {...register("title", { required: true })} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="price" className="flex items-center gap-2"><Banknote className="w-4 h-4 text-green-600" />Budget (INR)</Label>
                        <Input id="price" type="number" {...register("price", { required: true, min: 1 })} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input id="location" {...register("location", { required: true })} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="skills">Required Skills (Comma separated)</Label>
                        <Input id="skills" {...register("skills_input", { required: true })} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Task Details</Label>
                        <Textarea id="description" className="h-32" {...register("description", { required: true })} />
                    </div>
                    <Button type="submit" className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold" disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};
