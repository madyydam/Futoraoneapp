import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function Wallet() {
    const navigate = useNavigate();
    const [iframeUrl, setIframeUrl] = useState<string>("");
    const [loading, setLoading] = useState(true);

    const prepareWalletSession = useCallback(async () => {
        setLoading(true);
        // 1. Get current user
        const { data: { user } } = await supabase.auth.getUser();

        if (user?.email) {
            // 2. Construct URL with Auto-Login params
            // Note: The receiving app (FutoraWallet) needs to look for these params and handle the login logic.
            // We encode it to base64 or a token to be slightly cleaner, though standard params work if the wallet app supports it.
            // For now, passing email which matches the Unified Wallet system we built.
            const baseUrl = "https://futorawallet.vercel.app";
            const params = new URLSearchParams({
                sso_email: user.email,
                sso_name: user.user_metadata?.full_name || "",
                sso_source: "futora_one_app",
            });
            // Providing root URL, assuming app redirects or handles logic
            setIframeUrl(`${baseUrl}/?${params.toString()}`);
        } else {
            setIframeUrl("https://futorawallet.vercel.app");
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        prepareWalletSession();
    }, [prepareWalletSession]);

    return (
        <div className="flex flex-col h-screen bg-background">
            {/* Header / Nav Bar */}
            <div className="flex items-center px-4 py-3 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-10">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/profile")}
                    className="hover:bg-accent mr-2"
                >
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <h1 className="font-bold text-lg flex-1">Futora Wallet</h1>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                        setLoading(true);
                        const current = iframeUrl;
                        setIframeUrl("");
                        setTimeout(() => {
                            setIframeUrl(current);
                            setLoading(false);
                        }, 100);
                    }}
                >
                    <RefreshCw className="w-5 h-5" />
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 relative w-full overflow-hidden bg-muted/20">
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <iframe
                        src={iframeUrl}
                        className="w-full h-full border-0"
                        title="Futora Wallet"
                        allow="clipboard-write" // Allow copying addresses
                    />
                )}
            </div>
        </div>
    );
}
