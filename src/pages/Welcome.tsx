import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { motion, Variants, Easing } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Code, Cpu, Globe, Zap, Download } from "lucide-react";
import { useState, useEffect } from "react";

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
  const [isStandalone, setIsStandalone] = useState(true);

  useEffect(() => {
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(!!checkStandalone);
  }, []);

  return (
    <div className="dark min-h-screen bg-background text-foreground relative overflow-hidden flex flex-col justify-center">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-background z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background opacity-60"></div>
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-[128px] animate-pulse-slow"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[128px]"></div>

        {/* Abstract Grid */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 hidden light:block"></div>
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{ backgroundImage: 'linear-gradient(#999 1px, transparent 1px), linear-gradient(90deg, #999 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 flex flex-col items-center text-center">

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto space-y-8"
        >
          {/* Logo Badge */}
          <motion.div variants={itemVariants} className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
              <div className="relative bg-card/30 backdrop-blur-xl border border-white/10 p-4 rounded-3xl shadow-2xl">
                <Logo className="w-20 h-20 sm:w-24 sm:h-24 object-contain" />
              </div>
            </div>
          </motion.div>

          {/* Typography */}
          <motion.div variants={itemVariants} className="space-y-4">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight px-2">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 dark:from-white dark:to-slate-400">
                The Future of
              </span>
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-blue-500">
                Tech Community
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed px-4">
              Connect, showcase projects, and level up in the ultimate tech ecosystem.
            </p>
          </motion.div>

          {/* Feature Icons / Key Points */}
          <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-3 sm:gap-4 pb-6 text-muted-foreground/80 px-4 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium px-4 py-2 rounded-full bg-secondary/20 backdrop-blur-md border border-white/5 shadow-sm">
              <Code className="w-4 h-4 text-primary" /> Code Sharing
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium px-4 py-2 rounded-full bg-secondary/20 backdrop-blur-md border border-white/5 shadow-sm">
              <Zap className="w-4 h-4 text-yellow-500" /> Real-time Chat
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium px-4 py-2 rounded-full bg-secondary/20 backdrop-blur-md border border-white/5 shadow-sm">
              <Globe className="w-4 h-4 text-blue-500" /> Global Network
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-2 px-6 w-full sm:w-auto">
            <Button
              onClick={() => navigate("/auth?mode=signup")}
              className="h-12 sm:h-14 px-8 text-base sm:text-lg rounded-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg shadow-primary/25 transition-all hover:scale-105 group w-full sm:w-auto"
            >
              Get Started Now
              <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            {!isStandalone ? (
              <Button
                variant="outline"
                onClick={() => window.dispatchEvent(new CustomEvent('show-pwa-install'))}
                className="h-12 sm:h-14 px-8 text-base sm:text-lg rounded-full border-2 border-primary/20 hover:bg-primary/5 transition-all hover:scale-105 w-full sm:w-auto flex items-center gap-2 group"
              >
                <Download className="w-5 h-5 text-primary group-hover:animate-bounce" />
                Install App
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => navigate("/auth?mode=login")}
                className="h-12 sm:h-14 px-8 text-base sm:text-lg rounded-full border-2 hover:bg-secondary/50 transition-all hover:scale-105 w-full sm:w-auto"
              >
                Sign In
              </Button>
            )}
          </motion.div>

          <motion.div variants={itemVariants} className="pt-2">
            <button
              onClick={() => navigate("/auth?mode=login")}
              className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1 mx-auto"
            >
              Already have an account? <span className="font-bold underline">Sign In</span>
            </button>
          </motion.div>

          {/* Footer Links */}
          <motion.div variants={itemVariants} className="pt-12 flex justify-center gap-6 text-sm text-muted-foreground">
            <button onClick={() => navigate("/terms")} className="hover:text-primary transition-colors">Terms</button>
            <span className="text-muted-foreground/30">•</span>
            <button onClick={() => navigate("/privacy")} className="hover:text-primary transition-colors">Privacy</button>
            <span className="text-muted-foreground/30">•</span>
            <button onClick={() => navigate("/about")} className="hover:text-primary transition-colors">About</button>
          </motion.div>
        </motion.div>

      </div>

      {/* Decorative Bottom Gradient */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none"></div>
    </div>
  );
};

export default memo(Welcome);