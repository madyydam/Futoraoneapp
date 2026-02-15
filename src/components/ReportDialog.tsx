import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { ShieldAlert } from "lucide-react";

interface ReportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (reason: string, details: string) => void;
    targetType: 'post' | 'user' | 'comment';
}

const REPORT_REASONS = [
    { id: "spam", label: "Spam or misleading" },
    { id: "harassment", label: "Harassment or hate speech" },
    { id: "inappropriate", label: "Inappropriate content" },
    { id: "violence", label: "Violence or self-harm" },
    { id: "other", label: "Other" },
];

export const ReportDialog = ({
    open,
    onOpenChange,
    onConfirm,
    targetType,
}: ReportDialogProps) => {
    const [reason, setReason] = useState("spam");
    const [details, setDetails] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await onConfirm(reason, details);
            onOpenChange(false);
            setReason("spam");
            setDetails("");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-amber-500" />
                        Report {targetType}
                    </DialogTitle>
                    <DialogDescription>
                        Why are you reporting this {targetType}? Your report is anonymous.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <RadioGroup value={reason} onValueChange={setReason} className="gap-3">
                        {REPORT_REASONS.map((r) => (
                            <div key={r.id} className="flex items-center space-x-2">
                                <RadioGroupItem value={r.id} id={r.id} />
                                <Label htmlFor={r.id} className="font-medium cursor-pointer">
                                    {r.label}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>

                    <div className="grid gap-2">
                        <Label htmlFor="details">Additional details (optional)</Label>
                        <Textarea
                            id="details"
                            placeholder="Please provide more information..."
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            className="h-24"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="bg-amber-500 hover:bg-amber-600 text-white"
                    >
                        {isSubmitting ? "Submitting..." : `Report ${targetType}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
