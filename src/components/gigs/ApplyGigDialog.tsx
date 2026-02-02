import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Zap, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ApplyGigDialogProps {
    gigId: string;
    gigTitle: string;
    gigBudget: number;
    trigger?: React.ReactNode;
}

export const ApplyGigDialog = ({ gigId, gigTitle, gigBudget, trigger }: ApplyGigDialogProps) => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [proposal, setProposal] = useState("");
    const [bidAmount, setBidAmount] = useState(gigBudget.toString());
    const [timeline, setTimeline] = useState("");
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                toast({
                    title: "Authentication Required",
                    description: "Please sign in to apply for this gig.",
                    variant: "destructive"
                });
                return;
            }

            const { error } = await supabase
                .from('gig_applications' as any)
                .insert({
                    gig_id: gigId,
                    applicant_id: user.id,
                    proposal: proposal,
                    bid_amount: parseFloat(bidAmount),
                    expected_timeline: timeline,
                    status: 'pending'
                });

            if (error) throw error;

            toast({
                title: "Application Submitted! ⚡",
                description: `Your proposal for "${gigTitle}" has been sent successfully.`,
            });

            setOpen(false);
            setProposal("");
            setTimeline("");

        } catch (error: any) {
            console.error("Error applying:", error);
            toast({
                title: "Error sending application",
                description: error.message || "Something went wrong. Please try again.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="w-full gap-2 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold shadow-sm">
                        <Zap className="w-4 h-4" />
                        Apply for Gig
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Apply for {gigTitle}</DialogTitle>
                    <DialogDescription>
                        Submit your proposal and bid for this gig.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="bid">Your Bid Amount (₹)</Label>
                            <Input id="bid" type="number" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="timeline">Timeline</Label>
                            <Input id="timeline" placeholder="e.g. 5 days" value={timeline} onChange={(e) => setTimeline(e.target.value)} required />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="proposal">Why you?</Label>
                        <Textarea id="proposal" placeholder="I have done similar projects..." className="min-h-[120px]" value={proposal} onChange={(e) => setProposal(e.target.value)} required />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading} className="w-full">
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            {loading ? "Submitting..." : "Submit Proposal"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
