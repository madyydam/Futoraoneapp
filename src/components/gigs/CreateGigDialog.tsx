import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Zap, Banknote } from "lucide-react";

interface CreateGigForm {
    title: string;
    description: string;
    price: number;
    location: string;
    skills_input: string;
}

export const CreateGigDialog = ({ onGigCreated }: { onGigCreated: () => void }) => {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const { register, handleSubmit, reset } = useForm<CreateGigForm>();

    const onSubmit = async (data: CreateGigForm) => {
        setIsLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast({ title: "Gig Posted! ⚡", description: "Your task is live. Full feature coming soon!" });
            reset();
            setOpen(false);
            onGigCreated();
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Something went wrong";
            toast({ title: "Error", description: msg, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-yellow-400 hover:bg-yellow-500 text-black border-0 shadow-md font-semibold">
                    <Plus className="w-4 h-4" /> Post Gig
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <Zap className="w-6 h-6 text-yellow-500 fill-yellow-500" /> Post a Micro-Gig
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Task Title</Label>
                        <Input id="title" placeholder="e.g. Fix React Bug" {...register("title", { required: true })} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="price" className="flex items-center gap-2"><Banknote className="w-4 h-4 text-green-600" />Budget (INR)</Label>
                        <Input id="price" type="number" placeholder="e.g. 500" {...register("price", { required: true, min: 1 })} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="skills">Required Skills</Label>
                        <Input id="skills" placeholder="e.g. React, CSS, Node.js" {...register("skills_input", { required: true })} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Task Details</Label>
                        <Textarea id="description" placeholder="Describe exactly what needs to be done..." className="h-32" {...register("description", { required: true })} />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Posting...</> : "Post Gig"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};
