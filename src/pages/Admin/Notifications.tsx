import React, { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bell, ShieldAlert, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { sendBulkNotifications } from "@/services/notification.service";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminNotifications = () => {
    // Simple Badge component since we might not have it or want a custom one
    const Badge = ({ children, className }: { children: React.ReactNode, className?: string }) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white ${className}`}>
            {children}
        </span>
    );

    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !body) {
            toast.error("Please fill in both title and message.");
            return;
        }

        const confirm = window.confirm(`Send this notification to ALL users? \n\nTitle: ${title}\nBody: ${body}`);
        if (!confirm) return;

        setLoading(true);
        setStatus('idle');

        try {
            // 1. Fetch all user IDs who have an FCM token
            const { data: profiles, error: fetchError } = await supabase
                .from('profiles')
                .select('id')
                .not('fcm_token', 'is', null);

            if (fetchError) throw fetchError;

            if (!profiles || profiles.length === 0) {
                toast.error("No users found with active push tokens.");
                setLoading(false);
                return;
            }

            const userIds = profiles.map(p => p.id);

            // 2. Send Bulk Notifications
            await sendBulkNotifications({
                userIds,
                title,
                body,
                data: {
                    type: 'broadcast',
                    sent_at: new Date().toISOString()
                }
            });

            toast.success(`Broadcast sent to ${userIds.length} users! 🚀`);
            setStatus('success');
            setTitle("");
            setBody("");
        } catch (error) {
            console.error("Broadcast failed:", error);
            toast.error("Failed to send broadcast.");
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminLayout>
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                        Broadcast Hub <Bell className="text-blue-500 w-8 h-8" />
                    </h1>
                    <p className="text-slate-500 font-medium pt-1">
                        Send real-time push notifications directly to users' phones.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Main Form */}
                    <div className="md:col-span-2 space-y-6">
                        <Card className="border-slate-200 shadow-xl overflow-hidden">
                            <CardHeader className="bg-slate-50 border-b border-slate-100">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Send size={18} className="text-blue-600" /> New Broadcast
                                </CardTitle>
                                <CardDescription>This will trigger a system-level alert on Android/iOS devices.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6">
                                <form onSubmit={handleBroadcast} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 uppercase tracking-tighter">Notification Title</label>
                                        <Input
                                            placeholder="e.g. New Feature Alert! 🚀"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            className="h-12 text-lg font-medium border-slate-200 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 uppercase tracking-tighter">Message Body</label>
                                        <Textarea
                                            placeholder="Tell your users something exciting..."
                                            value={body}
                                            onChange={(e) => setBody(e.target.value)}
                                            className="min-h-[120px] text-base border-slate-200 focus:ring-blue-500"
                                        />
                                    </div>
                                    <Button
                                        disabled={loading}
                                        type="submit"
                                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-black text-lg gap-2 shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
                                    >
                                        {loading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                                        {loading ? "Sending..." : "Blast Notification"}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Stats & Help */}
                    <div className="space-y-6">
                        <Card className="border-slate-200 bg-blue-50/50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold text-blue-800 uppercase">Test Tools</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Button
                                    onClick={async () => {
                                        try {
                                            const { data: { user } } = await supabase.auth.getUser();
                                            if (!user) return toast.error("Log in first");

                                            // Get my own token
                                            const { data: profile } = await supabase
                                                .from('profiles')
                                                .select('fcm_token')
                                                .eq('id', user.id)
                                                .single();

                                            if (!profile?.fcm_token) {
                                                return toast.error("Your device has no token saved. Refresh app.");
                                            }

                                            await sendBulkNotifications({
                                                userIds: [user.id],
                                                title: "Test Alert! 🔔",
                                                body: "This is a direct test notification to your device.",
                                                data: { type: 'test' }
                                            });
                                            toast.success("Test sent to your device!");
                                        } catch (e) {
                                            toast.error("Test failed");
                                        }
                                    }}
                                    variant="outline"
                                    className="w-full text-xs font-bold gap-2"
                                >
                                    <Bell size={14} /> Test My Device
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="border-slate-200 bg-blue-50/50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold text-blue-800 uppercase">Pro Tips</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-blue-700 space-y-3">
                                <p className="flex gap-2">
                                    <CheckCircle2 size={16} className="shrink-0" />
                                    Keep titles short and punchy.
                                </p>
                                <p className="flex gap-2">
                                    <CheckCircle2 size={16} className="shrink-0" />
                                    Use emojis to increase open rates! 📈
                                </p>
                                <p className="flex gap-2">
                                    <AlertCircle size={16} className="shrink-0" />
                                    Don't spam! Max 1-2 per day.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-slate-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold text-slate-500 uppercase">System Status</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600">Firebase FCM</span>
                                    <Badge className="bg-green-500 border-0">Live</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600">PWA Manifest</span>
                                    <Badge className="bg-green-500 border-0">Healthy</Badge>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3 text-amber-800">
                            <ShieldAlert className="shrink-0 text-amber-500" />
                            <p className="text-xs font-medium">
                                **Caution:** Broadcasts cannot be undone. Always double check the content before blasting.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminNotifications;
