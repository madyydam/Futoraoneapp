import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Construction } from "lucide-react";

interface ViewGigApplicationsDialogProps {
    gigId: string;
    gigTitle: string;
}

export const ViewGigApplicationsDialog = ({ gigId, gigTitle }: ViewGigApplicationsDialogProps) => {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2 border-yellow-500/30 text-yellow-600 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-900/10">
                    <FileText className="w-4 h-4" />
                    View Proposals
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Proposals for {gigTitle}</DialogTitle>
                    <DialogDescription>Review bids from freelancers.</DialogDescription>
                </DialogHeader>
                <div className="py-12 text-center">
                    <Construction className="w-16 h-16 mx-auto mb-4 text-primary opacity-60" />
                    <h3 className="font-semibold text-lg">Coming Soon!</h3>
                    <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                        Proposal management will be available in the next update.
                    </p>
                    <Button onClick={() => setOpen(false)} className="mt-4">Got it</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
