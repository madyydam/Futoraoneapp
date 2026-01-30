import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReviewDialogProps {
    revieweeId: string;
    revieweeName: string;
    trigger?: React.ReactNode;
}

export function CreateReviewDialog({ revieweeId, revieweeName, trigger }: ReviewDialogProps) {
    const [open, setOpen] = useState(false);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async () => {
        if (rating === 0) {
            toast({
                title: "Rating required",
                description: "Please select a star rating",
                variant: "destructive",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            // Reviews feature coming soon - store locally for now
            toast({
                title: "Review submitted",
                description: "Thank you for your feedback! Reviews feature coming soon.",
            });

            setOpen(false);
            setRating(0);
            setComment("");

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Failed to submit review";
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" className="gap-2">
                        <Star className="w-4 h-4" />
                        Write Review
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Review {revieweeName}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                className="focus:outline-none transition-transform hover:scale-110"
                            >
                                <Star
                                    className={`w-8 h-8 ${star <= rating
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "text-muted-foreground"
                                        }`}
                                />
                            </button>
                        ))}
                    </div>
                    <div className="text-center text-sm text-muted-foreground">
                        {rating === 0 ? "Select a rating" : `${rating} out of 5 stars`}
                    </div>
                    <Textarea
                        placeholder="Share your experience working with this person..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="min-h-[100px]"
                    />
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? "Submitting..." : "Post Review"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
