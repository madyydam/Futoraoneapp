import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { CartoonLoader } from "@/components/CartoonLoader";

const FeedbackPage = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);

    // Form State
    const [rating, setRating] = useState<number>(0);
    const [bugReport, setBugReport] = useState("");
    const [featureSuggestion, setFeatureSuggestion] = useState("");

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate("/auth");
                return;
            }
            setUser(user);

            const { data: profile } = await supabase
                .from("profiles")
                .select("full_name, username")
                .eq("id", user.id)
                .single();
            setProfile(profile);
        };
        checkUser();
    }, [navigate]);

    const getDeviceInfo = () => {
        const ua = navigator.userAgent;
        let platform = "web";
        if (/android/i.test(ua)) platform = "android";
        else if (/iPad|iPhone|iPod/.test(ua)) platform = "ios";

        return {
            platform,
            app_version: "1.0.0", // This could be fetched from package.json or a config
            device_info: `${navigator.vendor} ${navigator.platform}`
        };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) {
            toast({
                title: "Rating Required",
                description: "Please rate your experience first.",
                variant: "destructive",
            });
            return;
        }

        if (bugReport.length < 20) {
            toast({
                title: "More Detail Needed",
                description: "Please describe the problem in at least 20 characters.",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            const device = getDeviceInfo();
            const { error } = await supabase.from("app_feedback").insert({
                user_id: user.id,
                user_name: profile?.full_name || profile?.username || user.email.split('@')[0],
                user_email: user.email,
                rating,
                bug_report: bugReport,
                feature_suggestion: featureSuggestion || null,
                platform: device.platform,
                app_version: device.app_version,
                device_info: device.device_info,
                status: 'new'
            });

            if (error) throw error;

            setSubmitted(true);
            toast({
                title: "Feedback Submitted!",
                description: "Thank you for helping us improve FutoraOne.",
            });
        } catch (error: any) {
            console.error("Error submitting feedback:", error);
            toast({
                title: "Submission Failed",
                description: error.message || "An error occurred while submitting feedback.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    if (!user) return <CartoonLoader />;

    if (submitted) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="space-y-6"
                >
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-12 h-12 text-green-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-foreground">Feedback Received!</h1>
                    <p className="text-muted-foreground text-lg max-w-md mx-auto">
                        Thanks! Your feedback has been submitted. Our team will review it shortly to make FutoraOne even better.
                    </p>
                    <Button
                        onClick={() => navigate("/profile")}
                        className="w-full max-w-xs gradient-primary text-white h-12 rounded-xl text-lg font-semibold"
                    >
                        Back to Profile
                    </Button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-10">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border px-4 py-4 flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(-1)}
                    className="rounded-full"
                >
                    <ArrowLeft size={20} />
                </Button>
                <div>
                    <h1 className="text-xl font-bold text-foreground leading-tight">Report a Problem</h1>
                    <p className="text-xs text-muted-foreground">Facing an issue or have an idea? Let us know.</p>
                </div>
            </div>

            <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
                <Card className="border-border bg-card overflow-hidden">
                    <CardContent className="p-6 space-y-8">
                        {/* Rating Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">1</span>
                                <h2 className="font-bold text-lg text-foreground">Rate your overall experience*</h2>
                            </div>
                            <p className="text-sm text-muted-foreground">Rate your overall experience with FutoraOne</p>

                            <div className="flex justify-between items-center px-2 py-4">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star)}
                                        className="transition-transform active:scale-90"
                                    >
                                        <Star
                                            size={42}
                                            className={star <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Bug Report Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">2</span>
                                <h2 className="font-bold text-lg text-foreground">Describe the Problem You're Facing*</h2>
                            </div>
                            <Textarea
                                placeholder="App crash, slow loading, feature not working, login issue, etc."
                                className="min-h-[150px] bg-secondary/30 border-border focus-visible:ring-primary text-base p-4 rounded-xl"
                                value={bugReport}
                                onChange={(e) => setBugReport(e.target.value)}
                                maxLength={1000}
                            />
                            <div className="flex justify-between text-[11px]">
                                <span className={bugReport.length < 20 ? "text-amber-600" : "text-emerald-600"}>
                                    {bugReport.length < 20 ? `Min 20 characters required (${20 - bugReport.length} left)` : "Length valid"}
                                </span>
                                <span className="text-muted-foreground">{bugReport.length}/1000</span>
                            </div>
                        </div>

                        {/* Feature Suggestion Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">3</span>
                                <h2 className="font-bold text-lg text-foreground">Feature Suggestion or Improvement</h2>
                            </div>
                            <p className="text-sm text-muted-foreground">Any feature you want us to add, remove, or improve? (Optional)</p>
                            <Textarea
                                placeholder="Describe your idea here..."
                                className="min-h-[100px] bg-secondary/30 border-border focus-visible:ring-primary text-base p-4 rounded-xl"
                                value={featureSuggestion}
                                onChange={(e) => setFeatureSuggestion(e.target.value)}
                                maxLength={1000}
                            />
                            <div className="text-right text-[11px] text-muted-foreground">
                                {featureSuggestion.length}/1000
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex flex-col gap-4">
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || rating === 0 || bugReport.length < 20}
                        className="w-full h-14 rounded-2xl text-lg font-bold gradient-primary text-white shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Submitting...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <Send size={20} />
                                Submit Feedback
                            </span>
                        )}
                    </Button>

                    <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                        <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
                        <p className="text-[11px] text-amber-700 leading-tight">
                            Your feedback is important to us. We collect anonymous device data (platform, version) to help us debug issues more effectively.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FeedbackPage;
