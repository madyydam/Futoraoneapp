import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, User, Lock, Bell, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BottomNav } from "@/components/BottomNav";
import { CartoonLoader } from "@/components/CartoonLoader";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

const Settings = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [settings, setSettings] = useState<any>({
        privacy: { read_receipts: true, online_status: true },
        notifications: { push: true, email: true },
        theme: { accent_color: "default" }
    });

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            navigate("/auth");
            return;
        }
        setUser(user);
        setEmail(user.email || "");

        // Load settings from localStorage as fallback since settings column doesn't exist
        const savedSettings = localStorage.getItem('futora_settings');
        if (savedSettings) {
            try {
                setSettings(JSON.parse(savedSettings));
            } catch (e) {
                console.error("Error parsing settings:", e);
            }
        }
        setLoading(false);
    };

    const updateSetting = async (category: string, key: string, value: any) => {
        const newSettings = {
            ...settings,
            [category]: {
                ...settings[category],
                [key]: value
            }
        };

        setSettings(newSettings);
        localStorage.setItem('futora_settings', JSON.stringify(newSettings));
        
        toast({ title: "Settings updated", description: "Your preferences have been saved." });
    };

    const handlePasswordUpdate = async () => {
        if (password !== confirmPassword) {
            toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
            return;
        }
        if (password.length < 6) {
            toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
            return;
        }

        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Success", description: "Password updated successfully" });
            setPassword("");
            setConfirmPassword("");
        }
    };

    const handleDeleteAccount = async () => {
        const subject = encodeURIComponent("Account Deletion Request");
        const body = encodeURIComponent(`Please delete my account associated with:\nEmail: ${email}\nUser ID: ${user?.id}\n\nI understand this action is irreversible.`);

        window.location.href = `mailto:support@futoraone.com?subject=${subject}&body=${body}`;

        toast({
            title: "Request Initiated",
            description: "Opening your email app to send the deletion request.",
            duration: 5000
        });
    };

    if (loading) return <CartoonLoader />;

    return (
        <div className="min-h-screen bg-background pb-20">
            <div className="sticky top-0 z-10 bg-card border-b border-border p-4 flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-xl font-bold">Settings</h1>
            </div>

            <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
                <Tabs defaultValue="account" className="w-full flex flex-col md:flex-row gap-6">
                    <TabsList className="flex md:flex-col h-auto justify-start bg-transparent p-0 w-full md:w-64 gap-1">
                        <TabsTrigger
                            value="account"
                            className="w-full justify-start px-4 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                        >
                            <User className="w-4 h-4 mr-3" /> Account
                        </TabsTrigger>
                        <TabsTrigger
                            value="privacy"
                            className="w-full justify-start px-4 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                        >
                            <Lock className="w-4 h-4 mr-3" /> Privacy
                        </TabsTrigger>
                        <TabsTrigger
                            value="notifications"
                            className="w-full justify-start px-4 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                        >
                            <Bell className="w-4 h-4 mr-3" /> Notifications
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex-1 space-y-6">
                        <TabsContent value="account" className="space-y-4 m-0">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Profile Information</CardTitle>
                                    <CardDescription>Update your email.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Email</Label>
                                        <Input value={email} disabled />
                                        <p className="text-xs text-muted-foreground">Contact support to change email.</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Change Password</CardTitle>
                                    <CardDescription>Update your password securely.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>New Password</Label>
                                        <Input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Confirm Password</Label>
                                        <Input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                        />
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button onClick={handlePasswordUpdate} disabled={!password}>Update Password</Button>
                                </CardFooter>
                            </Card>

                            <Card className="border-destructive/20">
                                <CardHeader>
                                    <CardTitle className="text-destructive">Danger Zone</CardTitle>
                                    <CardDescription>Irreversible actions.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="destructive" className="w-full sm:w-auto">Delete Account</Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Are you absolutely sure?</DialogTitle>
                                                <DialogDescription>
                                                    This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <DialogFooter>
                                                <Button variant="outline">Cancel</Button>
                                                <Button variant="destructive" onClick={handleDeleteAccount}>Delete Account</Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="privacy" className="space-y-4 m-0">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Privacy Controls</CardTitle>
                                    <CardDescription>Manage how others see you.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 -mx-2 rounded-lg transition-colors" onClick={() => navigate('/profile-views')}>
                                        <div className="space-y-0.5">
                                            <Label className="cursor-pointer">Who Viewed My Profile</Label>
                                            <p className="text-sm text-muted-foreground">See who has visited your profile recently.</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <Separator />
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Read Receipts</Label>
                                            <p className="text-sm text-muted-foreground">Let others know when you've read their messages.</p>
                                        </div>
                                        <Switch
                                            checked={settings.privacy?.read_receipts}
                                            onCheckedChange={(checked) => updateSetting('privacy', 'read_receipts', checked)}
                                        />
                                    </div>
                                    <Separator />
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Online Status</Label>
                                            <p className="text-sm text-muted-foreground">Show when you're active on Futora.</p>
                                        </div>
                                        <Switch
                                            checked={settings.privacy?.online_status}
                                            onCheckedChange={(checked) => updateSetting('privacy', 'online_status', checked)}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="notifications" className="space-y-4 m-0">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Notification Preferences</CardTitle>
                                    <CardDescription>Choose what you want to be notified about.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Push Notifications</Label>
                                            <p className="text-sm text-muted-foreground">Receive push notifications on this device.</p>
                                        </div>
                                        <Switch
                                            checked={settings.notifications?.push}
                                            onCheckedChange={(checked) => updateSetting('notifications', 'push', checked)}
                                        />
                                    </div>
                                    <Separator />
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label>Email Notifications</Label>
                                            <p className="text-sm text-muted-foreground">Receive daily digests and important updates.</p>
                                        </div>
                                        <Switch
                                            checked={settings.notifications?.email}
                                            onCheckedChange={(checked) => updateSetting('notifications', 'email', checked)}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </div>
                </Tabs>
            </div>

            <BottomNav />
        </div>
    );
};

export default Settings;