import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ApplyFounderDialogProps {
    listingId: string;
    listingRole: string;
    trigger?: React.ReactNode;
}

export const ApplyFounderDialog = ({ listingId, listingRole, trigger }: ApplyFounderDialogProps) => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [contactInfo, setContactInfo] = useState("");
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                toast({
                    title: "Authentication Required",
                    description: "Please sign in to connect with this founder.",
                    variant: "destructive"
                });
                return;
            }

            const { error } = await supabase
                .from('founder_applications' as any)
                .insert({
                    listing_id: listingId,
                    applicant_id: user.id,
                    message: message,
                    contact_info: contactInfo,
                    status: 'pending'
                });

            if (error) throw error;

            toast({
                title: "Application Sent! 🚀",
                description: `Your interest in the ${listingRole} role has been sent successfully.`,
                className: "bg-green-500 text-white border-none"
            });

            setOpen(false);
            setMessage("");
            setContactInfo("");

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
                    <Button className="w-full gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-md">
                        <Briefcase className="w-4 h-4" />
                        Connect with Founder
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Connect for {listingRole}</DialogTitle>
                    <DialogDescription>
                        Send a message to the founder explaining why you'd be a great fit.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="message">Your Message / Pitch</Label>
                        <Textarea
                            id="message"
                            placeholder="Hi, I saw your listing for a CTO. I have experience with..."
                            className="min-h-[120px]"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="contact">Contact Info (Email/LinkedIn)</Label>
                        <Input
                            id="contact"
                            placeholder="linkedin.com/in/username"
                            value={contactInfo}
                            onChange={(e) => setContactInfo(e.target.value)}
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-orange-500 to-pink-600 text-white">
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Send Request
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
