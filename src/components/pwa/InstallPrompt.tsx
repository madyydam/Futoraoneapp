import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { X, Download, Share, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Debug flag for testing
    (window as any).DEBUG_PWA_INSTALL = () => setIsVisible(true);

    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) return;

    // Capture the prompt event
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Check if dismissed recently
      const hasDismissed = localStorage.getItem('pwa-dismissed');
      if (!hasDismissed || (Date.now() - parseInt(hasDismissed, 10) > 86400000)) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // For iOS, check dismissal separately since there is no beforeinstallprompt event
    if (isIOSDevice) {
      const hasDismissed = localStorage.getItem('pwa-dismissed');
      if (!hasDismissed || (Date.now() - parseInt(hasDismissed, 10) > 86400000)) {
        const timer = setTimeout(() => setIsVisible(true), 1500);
        return () => clearTimeout(timer);
      }
    }

    const showHandler = () => {
      setIsVisible(true);
    };
    window.addEventListener('show-pwa-install', showHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('show-pwa-install', showHandler);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (isIOS) {
      setShowIOSGuide(prev => !prev);
      return;
    }

    if (!deferredPrompt) {
      alert("To install, tap your browser menu (⋮ or Share) and select 'Add to Home Screen' or 'Install App'.");
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error('PWA: Error during installation:', err);
    }
  }, [deferredPrompt, isIOS]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setShowIOSGuide(false);
    localStorage.setItem('pwa-dismissed', Date.now().toString());
  }, []);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="sticky top-0 z-[60] w-full bg-gradient-to-r from-primary via-indigo-600 to-purple-600 text-white shadow-md border-b border-white/10"
        aria-label="Install One App"
      >
        <div className="max-w-4xl mx-auto px-3 py-2 flex items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <Smartphone className="h-4 w-4 text-white" />
            </div>
            <div className="truncate">
              <span className="font-bold tracking-tight text-white mr-1.5">One App:</span>
              <span className="text-white/80 hidden sm:inline">Install on your phone for instant, smooth access</span>
              <span className="text-white/80 sm:hidden">Fast phone install</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleInstallClick}
              className="h-7 px-3 text-xs font-bold rounded-lg bg-white text-primary hover:bg-white/90 shadow transition-transform active:scale-95"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Install
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleDismiss}
              className="h-7 w-7 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Expandable iOS Installation Guide */}
        {showIOSGuide && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-black/30 backdrop-blur-md px-4 py-2.5 border-t border-white/10 text-xs text-white/90"
          >
            <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Share className="h-4 w-4 text-primary-foreground shrink-0" />
                <span>
                  Tap <strong>Share</strong> in Safari, then select <strong>Add to Home Screen ⊞</strong>
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowIOSGuide(false)}
                className="h-6 text-[11px] text-white/80 hover:text-white p-1"
              >
                Got it
              </Button>
            </div>
          </motion.div>
        )}
      </motion.aside>
    </AnimatePresence>
  );
};
