import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { motion, Variants, Easing } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Code, Cpu, Globe, Zap, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as Easing } }
};

const Welcome = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(!!checkStandalone);

    const searchParams = new URLSearchParams(window.location.search);
    const oauthError = searchParams.get("error_description") || searchParams.get("error");
    if (oauthError) {
      toast({
        title: "Google Sign-In Cancelled",
        description: oauthError,
        variant: "destructive",
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const hasOAuthParams =
      searchParams.has("code") ||
      window.location.hash.includes("access_token=");

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && hasOAuthParams) {
        navigate("/feed", { replace: true });
      }
    });

    if (hasOAuthParams) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          navigate("/feed", { replace: true });
        }
      });
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8faff] via-white to-[#f1f5ff] text-slate-900 relative overflow-hidden flex flex-col justify-center py-8">
      {/* Lightweight Light Ambient Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.09),transparent_60%)]" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(37, 99, 235, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(37, 99, 235, 0.05) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 flex flex-col items-center text-center">

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto space-y-7"
        >
          {/* 3D Elevated Logo Badge */}
          <motion.div variants={itemVariants} className="flex justify-center">
            <div className="relative bg-white border border-blue-100/90 p-4 rounded-3xl shadow-[0_16px_36px_-10px_rgba(37,99,235,0.22),0_4px_12px_-2px_rgba(15,23,42,0.06),inset_0_1px_0_#ffffff]">
              <Logo className="w-16 h-16 sm:w-20 sm:h-20 object-contain" />
            </div>
          </motion.div>

          {/* Typography */}
          <motion.div variants={itemVariants} className="space-y-3.5">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight px-2 leading-[1.12]">
              <span className="text-slate-900">
                The Future of
              </span>
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-blue-600 to-purple-600">
                Tech Community
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-slate-600 max-w-lg mx-auto leading-relaxed px-4">
              Connect, showcase projects, and level up in the ultimate tech ecosystem.
            </p>
          </motion.div>

          {/* 3D Tactile Feature Pills */}
          <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-2.5 sm:gap-3.5 pb-3 text-slate-700 px-4 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold px-4 py-2 rounded-full bg-white border border-slate-200/90 shadow-[0_3px_10px_-2px_rgba(15,23,42,0.06),inset_0_1px_0_#ffffff]">
              <Code className="w-4 h-4 text-primary" /> Code Sharing
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold px-4 py-2 rounded-full bg-white border border-slate-200/90 shadow-[0_3px_10px_-2px_rgba(15,23,42,0.06),inset_0_1px_0_#ffffff]">
              <Zap className="w-4 h-4 text-amber-500" /> Real-time Chat
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold px-4 py-2 rounded-full bg-white border border-slate-200/90 shadow-[0_3px_10px_-2px_rgba(15,23,42,0.06),inset_0_1px_0_#ffffff]">
              <Globe className="w-4 h-4 text-blue-500" /> Global Network
            </div>
          </motion.div>

          {/* 3D Tactile CTA Buttons */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3.5 justify-center pt-1 px-6 w-full sm:w-auto">
            <Button
              onClick={() => navigate("/auth?mode=signup")}
              className="h-12 sm:h-14 px-8 text-base sm:text-lg font-bold rounded-full bg-gradient-to-r from-primary via-blue-600 to-purple-600 hover:from-primary/95 hover:to-purple-600/95 text-white border border-blue-500/20 shadow-[0_10px_24px_-6px_rgba(37,99,235,0.48),0_3px_0_0_rgba(29,78,216,0.65),inset_0_1px_1px_rgba(255,255,255,0.35)] hover:shadow-[0_14px_28px_-6px_rgba(37,99,235,0.52),0_3px_0_0_rgba(29,78,216,0.65)] hover:-translate-y-0.5 active:translate-y-[2px] active:shadow-[0_4px_12px_-4px_rgba(37,99,235,0.4)] transition-all duration-150 group w-full sm:w-auto"
            >
              Get Started Now
              <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            {!isStandalone ? (
              <Button
                variant="outline"
                onClick={() => window.dispatchEvent(new CustomEvent('show-pwa-install'))}
                className="h-12 sm:h-14 px-8 text-base sm:text-lg font-semibold rounded-full bg-white text-slate-800 border border-slate-200 shadow-[0_6px_16px_-4px_rgba(15,23,42,0.09),0_2px_0_0_#e2e8f0,inset_0_1px_0_#ffffff] hover:bg-slate-50 hover:text-slate-900 hover:-translate-y-0.5 active:translate-y-[2px] active:shadow-[0_2px_6px_-2px_rgba(15,23,42,0.08)] transition-all duration-150 w-full sm:w-auto flex items-center gap-2 group"
              >
                <Download className="w-5 h-5 text-primary group-hover:translate-y-0.5 transition-transform" />
                Install App
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => navigate("/auth?mode=login")}
                className="h-12 sm:h-14 px-8 text-base sm:text-lg font-semibold rounded-full bg-white text-slate-800 border border-slate-200 shadow-[0_6px_16px_-4px_rgba(15,23,42,0.09),0_2px_0_0_#e2e8f0,inset_0_1px_0_#ffffff] hover:bg-slate-50 hover:text-slate-900 hover:-translate-y-0.5 active:translate-y-[2px] transition-all duration-150 w-full sm:w-auto"
              >
                Sign In
              </Button>
            )}
          </motion.div>

          <motion.div variants={itemVariants} className="flex justify-center px-6">
            <GoogleSignInButton
              label="Continue with Google"
              redirectPath="/auth"
              className="h-12 px-8 text-sm sm:text-base rounded-full w-full sm:w-auto bg-white text-slate-800 border border-slate-200 shadow-[0_6px_16px_-4px_rgba(15,23,42,0.09),0_2px_0_0_#e2e8f0,inset_0_1px_0_#ffffff] hover:bg-slate-50 hover:-translate-y-0.5 active:translate-y-[2px] transition-all duration-150"
            />
          </motion.div>

          <motion.div variants={itemVariants} className="pt-1">
            <button
              onClick={() => navigate("/auth?mode=login")}
              className="text-sm text-slate-600 hover:text-primary transition-colors flex items-center justify-center gap-1 mx-auto"
            >
              Already have an account? <span className="font-bold text-primary underline">Sign In</span>
            </button>
          </motion.div>

          {/* Footer Links */}
          <motion.div variants={itemVariants} className="pt-8 flex justify-center gap-6 text-sm text-slate-500">
            <button onClick={() => navigate("/terms")} className="hover:text-primary transition-colors">Terms</button>
            <span className="text-slate-300">•</span>
            <button onClick={() => navigate("/privacy")} className="hover:text-primary transition-colors">Privacy</button>
            <span className="text-slate-300">•</span>
            <button onClick={() => navigate("/about")} className="hover:text-primary transition-colors">About</button>
          </motion.div>
        </motion.div>

      </div>
    </div>
  );
};

export default memo(Welcome);