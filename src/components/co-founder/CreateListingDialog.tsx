import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Rocket } from "lucide-react";

interface CreateListingForm {
    role_needed: string;
    idea_description: string;
    equity_range: string;
    stage: string;
    industry: string;
    location: string;
}

export const CreateListingDialog = ({ onPostCreated }: { onPostCreated: () => void }) => {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CreateListingForm>();

    const onSubmit = async (data: CreateListingForm) => {
        setIsLoading(true);
        try {
            // Simulate posting - feature coming soon
            await new Promise(resolve => setTimeout(resolve, 1000));

            toast({
                title: "Listing Posted!",
                description: "Good luck finding your co-founder! 🚀 Full feature coming soon.",
            });

            reset();
            setOpen(false);
            onPostCreated();

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Something went wrong";
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 shadow-lg border-0">
                    <Plus className="w-4 h-4" />
                    Post Listing
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <Rocket className="w-6 h-6 text-orange-500" />
                        Find a Co-Founder
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="role">Role Needed</Label>
                        <Input
                            id="role"
                            placeholder="e.g. CTO, Marketing Co-founder"
                            {...register("role_needed", { required: true })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="industry">Industry</Label>
                        <Select onValueChange={(val) => setValue("industry", val)}>
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
                        <Select onValueChange={(val) => setValue("stage", val)}>
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
                            placeholder="e.g. 5-10%, Equity Only"
                            {...register("equity_range", { required: true })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                            id="location"
                            placeholder="e.g. Bangalore, Remote"
                            {...register("location", { required: true })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">The Pitch (Idea)</Label>
                        <Textarea
                            id="description"
                            placeholder="Describe your vision and what you're building..."
                            className="h-32"
                            {...register("idea_description", { required: true })}
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Posting...
                            </>
                        ) : (
                            "Post Listing"
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};
