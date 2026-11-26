import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bell, ShieldAlert, CheckCircle2, AlertCircle, Loader2, Mail } from "lucide-react";
import { sendBulkNotifications } from "@/services/notification.service";
import { sendAdminTestEmail, triggerFiveDayEmailDigest } from "@/services/email.service";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const AdminNotifications = () => {
    const { user: currentAdmin } = useAuth();
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
    const [testEmailTo, setTestEmailTo] = useState("");
    const [emailLoading, setEmailLoading] = useState(false);

    useEffect(() => {
        if (currentAdmin?.email && !testEmailTo) {
            setTestEmailTo(currentAdmin.email);
        }
    }, [currentAdmin?.email, testEmailTo]);

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
            const { data: pushUsers, error: fetchError } = await supabase
                .from('user_push_tokens' as any)
                .select('user_id');

            if (fetchError) throw fetchError;

            if (!pushUsers || pushUsers.length === 0) {
                toast.error("No users found with active push tokens.");
                setLoading(false);
                return;
            }

            const userIds = (pushUsers as { user_id: string }[]).map(p => p.user_id);

            await sendBulkNotifications({
                userIds,
                title,
                body,
                isBroadcast: true,
                data: {
                    type: 'broadcast',
                    sent_at: new Date().toISOString()
                }
            });

            await (supabase.rpc as any)('log_admin_action', {
                p_action: 'BROADCAST_PUSH',
                p_target_type: 'push_notification',
                p_target_id: String(userIds.length),
                p_details: { title, recipient_count: userIds.length },
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

                                            // Verify current admin has an active push token saved in owner-only table
                                            const { data: pushToken } = await supabase
                                                .from('user_push_tokens' as never)
                                                .select('fcm_token')
                                                .eq('user_id', user.id)
                                                .maybeSingle();

                                            if (!(pushToken as { fcm_token?: string } | null)?.fcm_token) {
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

                        <Card className="border-slate-200 bg-indigo-50/50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold text-indigo-900 uppercase flex items-center gap-2">
                                    <Mail size={14} /> Cloudflare SMTP (One)
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Sender: sales@futoragroup.in via smtp.mx.cloudflare.net:465
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Input
                                    type="email"
                                    placeholder="recipient@domain.com"
                                    value={testEmailTo}
                                    onChange={(e) => setTestEmailTo(e.target.value)}
                                    className="h-9 text-xs bg-white"
                                />
                                <Button
                                    disabled={emailLoading}
                                    onClick={async () => {
                                        setEmailLoading(true);
                                        try {
                                            const res = await sendAdminTestEmail(testEmailTo.trim() || undefined);
                                            toast.success(`Test email sent to ${res.to}`);
                                        } catch (err) {
                                            toast.error(err instanceof Error ? err.message : "Failed to send SMTP test");
                                        } finally {
                                            setEmailLoading(false);
                                        }
                                    }}
                                    variant="outline"
                                    className="w-full text-xs font-bold gap-2"
                                >
                                    <Mail size={14} /> Send SMTP Test Email
                                </Button>
                                <Button
                                    disabled={emailLoading}
                                    onClick={async () => {
                                        setEmailLoading(true);
                                        try {
                                            const res = await triggerFiveDayEmailDigest();
                                            toast.success(`5-day digest: ${res.sent} sent, ${res.failed} failed`);
                                        } catch (err) {
                                            toast.error(err instanceof Error ? err.message : "Failed to run 5-day digest");
                                        } finally {
                                            setEmailLoading(false);
                                        }
                                    }}
                                    variant="default"
                                    className="w-full text-xs font-bold gap-2"
                                >
                                    <Send size={14} /> Run 5-Day Email Digest
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
