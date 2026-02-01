import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { SidebarIcon } from "lucide-react";
import { Save, RotateCcw, ShieldCheck, Mail, Globe, AlertTriangle, RefreshCw, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const SettingsPage = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState<Record<string, any>>({});
    const { toast } = useToast();

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("app_config" as any)
                .select("*");

            if (error) throw error;

            // Transform array to object for easier state management
            const configMap: Record<string, any> = {};
            data?.forEach((item: any) => {
                configMap[item.key] = item.value;
            });

            // Set defaults if missing
            if (!configMap["site_name"]) configMap["site_name"] = "FutoraOne";
            if (!configMap["support_email"]) configMap["support_email"] = "support@futoraone.com";
            if (configMap["public_registration"] === undefined) configMap["public_registration"] = true;
            if (configMap["maintenance_mode"] === undefined) configMap["maintenance_mode"] = false;
            if (configMap["force_2fa_admins"] === undefined) configMap["force_2fa_admins"] = true;

            setConfig(configMap);
        } catch (error) {
            console.error("Error fetching config:", error);
            toast({
                title: "Error",
                description: "Failed to load application settings.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const updates = Object.entries(config).map(([key, value]) => ({
                key,
                value,
                updated_at: new Date().toISOString(),
            }));

            const { error } = await supabase
                .from("app_config" as any)
                .upsert(updates);

            if (error) throw error;

            // Log the action
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from("admin_logs" as any).insert({
                    admin_id: user.id,
                    action: "UPDATE_SETTINGS",
                    details: config,
                });
            }

            toast({
                title: "Settings Saved",
                description: "Global application configuration has been updated.",
            });
        } catch (error) {
            console.error("Error saving settings:", error);
            toast({
                title: "Save Failed",
                description: "Could not update settings. Check your permissions.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const updateConfig = (key: string, value: any) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex justify-center items-center h-[50vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-100 border-b-primary"></div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-10 max-w-5xl pb-20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-2">Site Settings</h2>
                        <p className="text-slate-500 font-medium italic">Configure global parameters and feature flags.</p>
                        <div className="space-y-6 max-w-4xl mx-auto pb-20">
                            <div>
                                <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-2">Settings</h2>
                                <p className="text-slate-500 font-medium">Manage your application's global settings.</p>
                            </div>

                            <Card className="shadow-lg shadow-slate-200/50 border-slate-200 rounded-3xl overflow-hidden bg-white">
                                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                                            <Globe className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg font-black text-slate-900">General</CardTitle>
                                            <CardDescription className="text-slate-500 font-medium">Basic site information.</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 space-y-6">
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label className="text-slate-900 font-bold">Site Name</Label>
                                            <Input
                                                value={config.site_name || ''}
                                                onChange={(e) => updateConfig('site_name', e.target.value)}
                                                placeholder="e.g. FutoraOne"
                                                className="h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-primary/20 font-medium"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-900 font-bold">Support Email</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <Input
                                                    value={config.support_email || ''}
                                                    onChange={(e) => updateConfig('support_email', e.target.value)}
                                                    placeholder="support@example.com"
                                                    className="pl-11 h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-primary/20 font-medium"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-lg shadow-slate-200/50 border-slate-200 rounded-3xl overflow-hidden bg-white">
                                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                                            <Shield className="w-5 h-5 text-indigo-500" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg font-black text-slate-900">Security & Access</CardTitle>
                                            <CardDescription className="text-slate-500 font-medium">Control who can access the site.</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 space-y-6">
                                    <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                                        <div className="space-y-0.5">
                                            <Label className="text-base font-bold text-slate-900">Public Registration</Label>
                                            <p className="text-sm text-slate-500 font-medium">Allow new users to sign up.</p>
                                        </div>
                                        <Switch
                                            checked={config.public_registration}
                                            onCheckedChange={(checked) => updateConfig('public_registration', checked)}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                                        <div className="space-y-0.5">
                                            <Label className="text-base font-bold text-slate-900">Force Admin 2FA</Label>
                                            <p className="text-sm text-slate-500 font-medium">Require two-factor auth for admins.</p>
                                        </div>
                                        <Switch
                                            checked={config.force_2fa_admins}
                                            onCheckedChange={(checked) => updateConfig('force_2fa_admins', checked)}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-lg shadow-slate-200/50 border-red-100 rounded-3xl overflow-hidden bg-white">
                                <CardHeader className="bg-red-50/50 border-b border-red-100 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-xl border border-red-100 shadow-sm">
                                            <AlertTriangle className="w-5 h-5 text-red-500" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg font-black text-red-900">Danger Zone</CardTitle>
                                            <CardDescription className="text-red-600/80 font-medium">Advanced controls.</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between p-4 rounded-2xl border border-red-100 bg-red-50/30">
                                        <div className="space-y-0.5">
                                            <Label className="text-base font-bold text-red-900">Maintenance Mode</Label>
                                            <p className="text-sm text-red-600/80 font-medium">Disable the site for everyone except admins.</p>
                                        </div>
                                        <Switch
                                            checked={config.maintenance_mode}
                                            onCheckedChange={(checked) => updateConfig('maintenance_mode', checked)}
                                            className="data-[state=checked]:bg-red-500"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex items-center gap-4 pt-4">
                                <Button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="h-12 px-8 rounded-xl font-bold text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all w-full sm:w-auto"
                                >
                                    {saving ? (
                                        <>
                                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Save Changes
                                        </>
                                    )}
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={fetchConfig}
                                    disabled={saving}
                                    className="h-12 px-6 rounded-xl font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                >
                                    Reset
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default SettingsPage;
