import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, ArrowRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const AdminLogin = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Check if already logged in as admin
    useEffect(() => {
        const checkExistingSession = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user && user.email === 'madhurdhadve@gmail.com') {
                navigate("/admin");
            }
        };
        checkExistingSession();
    }, [navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (email !== 'madhurdhadve@gmail.com') {
            toast.error("Unauthorized: Access Denied 🚫");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            toast.success("Welcome Back, Admin! 🛡️");
            navigate("/admin");
        } catch (error: any) {
            toast.error(error.message || "Failed to login");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
            {/* Background Decorative Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[128px] animate-pulse" />
            </div>

            <Card className="w-full max-w-md bg-black/40 border-slate-800 backdrop-blur-xl relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-emerald-500 to-primary" />

                <CardHeader className="space-y-4 pt-8 text-center">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 mb-2">
                        <Shield className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-3xl font-black tracking-tight text-white mb-2">
                            FO Admin Portal
                        </CardTitle>
                        <CardDescription className="text-slate-400 font-medium">
                            Enter credentials to access the command center.
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 pb-8">
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <div className="relative">
                                <Input
                                    type="email"
                                    placeholder="Admin Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-black/50 border-slate-800 text-white h-12 pl-4 focus:ring-primary focus:border-primary transition-all pr-10"
                                    required
                                />
                                {email === 'madhurdhadve@gmail.com' && (
                                    <Shield className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Input
                                type="password"
                                placeholder="Master Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-black/50 border-slate-800 text-white h-12 pl-4 focus:ring-primary focus:border-primary transition-all"
                                required
                            />
                        </div>

                        {email && email !== 'madhurdhadve@gmail.com' && (
                            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-bold animate-in fade-in slide-in-from-top-1">
                                <AlertCircle className="w-4 h-4" />
                                Access restricted to authorized email only.
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={loading || (email && email !== 'madhurdhadve@gmail.com')}
                            className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 group transition-all"
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Verify & Access
                                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="text-center">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                            Secure Encrypted Session
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminLogin;
