import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Construction } from "lucide-react";

interface CreateGroupDialogProps {
    onGroupCreated?: () => void;
}

export function CreateGroupDialog({ onGroupCreated }: CreateGroupDialogProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        toast({
            title: "Coming Soon!",
            description: "Group creation will be available in the next update.",
        });
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Group
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create a Community</DialogTitle>
                </DialogHeader>
                <div className="py-8 text-center">
                    <Construction className="w-16 h-16 mx-auto mb-4 text-primary opacity-60" />
                    <h3 className="font-semibold text-lg">Coming Soon!</h3>
                    <p className="text-muted-foreground mt-2">
                        Group communities will be available in the next update. Stay tuned!
                    </p>
                    <Button onClick={() => setOpen(false)} className="mt-4">
                        Got it
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
