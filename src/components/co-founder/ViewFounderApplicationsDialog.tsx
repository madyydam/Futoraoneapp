import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, Construction } from "lucide-react";

interface ViewFounderApplicationsDialogProps {
    listingId: string;
    listingRole: string;
}

export const ViewFounderApplicationsDialog = ({ listingId, listingRole }: ViewFounderApplicationsDialogProps) => {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2 border-primary/20 text-primary hover:bg-primary/5">
                    <Mail className="w-4 h-4" />
                    View Applications
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Applications for {listingRole}</DialogTitle>
                    <DialogDescription>
                        Review the people interested in co-founding with you.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-12 text-center">
                    <Construction className="w-16 h-16 mx-auto mb-4 text-primary opacity-60" />
                    <h3 className="font-semibold text-lg">Coming Soon!</h3>
                    <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                        Application management will be available in the next update. Stay tuned!
                    </p>
                    <Button onClick={() => setOpen(false)} className="mt-4">
                        Got it
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
