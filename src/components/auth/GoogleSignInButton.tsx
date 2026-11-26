import { useState, useCallback, memo } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface GoogleSignInButtonProps {
  label?: string;
  redirectPath?: string;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  disabled?: boolean;
}

const GoogleLogo = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
    />
  </svg>
);

export const GoogleSignInButton = memo(({
  label = "Continue with Google",
  redirectPath = "/auth",
  className,
  variant = "outline",
  disabled = false,
}: GoogleSignInButtonProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleGoogleSignIn = useCallback(async () => {
    if (loading || disabled) return;
    setLoading(true);
    try {
      const normalizedPath = redirectPath.startsWith("/") ? redirectPath : `/${redirectPath}`;
      const redirectTo = `${window.location.origin}${normalizedPath}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (error) throw error;
    } catch (error) {
      setLoading(false);
      const message = error instanceof Error ? error.message : "Could not start Google Sign-In";
      toast({
        title: "Google Sign-In Failed",
        description: message,
        variant: "destructive",
      });
    }
  }, [disabled, loading, redirectPath, toast]);

  return (
    <Button
      type="button"
      variant={variant}
      disabled={loading || disabled}
      onClick={handleGoogleSignIn}
      className={cn(
        "gap-3 font-semibold bg-white text-slate-900 hover:bg-slate-100 border border-slate-200/80 shadow-md transition-all",
        className
      )}
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-700" /> : <GoogleLogo />}
      <span>{loading ? "Redirecting to Google..." : label}</span>
    </Button>
  );
});

GoogleSignInButton.displayName = "GoogleSignInButton";
