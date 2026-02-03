import { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHelpTour } from "@/contexts/HelpTourContext";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Sparkles, PartyPopper } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLocation, useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";

export const TourController = () => {
    const { activeTour, currentStep, steps, isMandatory, nextStep, prevStep, endTour, triggerAction } = useHelpTour();
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const location = useLocation();
    const navigate = useNavigate();

    const activeStep = steps[currentStep];

    // Handle route changes and actions
    useEffect(() => {
        if (!activeStep) return;

        if (activeStep.route && location.pathname !== activeStep.route) {
            navigate(activeStep.route);
            setTargetRect(null); // Clear rect while navigating
            return;
        }

        // Reset target rect to null when step changes to force re-evaluation
        // This ensures if element isn't found, card centers instead of using stale position
        setTargetRect(null);

        // 2. Trigger action if any
        if (activeStep.action) {
            triggerAction(activeStep.action);
        }

        // 3. Wait for element and update rect
        const findAndSetRect = () => {
            const element = document.querySelector(activeStep.selector);
            if (element) {
                setTargetRect(element.getBoundingClientRect());
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return true;
            }
            return false;
        };

        // Poll for element (useful after navigation or modal open)
        let attempts = 0;
        const interval = setInterval(() => {
            if (findAndSetRect() || attempts > 20) {
                clearInterval(interval);
            }
            attempts++;
        }, 100);

        window.addEventListener('resize', findAndSetRect);
        window.addEventListener('scroll', findAndSetRect);

        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', findAndSetRect);
            window.removeEventListener('scroll', findAndSetRect);
        };
    }, [activeStep, currentStep, location.pathname, navigate, triggerAction]);

    // Handle Keyboard Support (Enter for Next)
    useEffect(() => {
        if (!activeTour) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                nextStep();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeTour, nextStep]);

    // Calculate safe absolute position
    const cardPos = useMemo(() => {
        const cardWidth = Math.min(350, window.innerWidth - 30);
        const cardHeight = 280; // Estimated max height
        const padding = 15;

        if (!targetRect) return {
            top: '50%',
            left: '50%',
            width: `${cardWidth}px`,
            transform: 'translate(-50%, -50%)',
            position: 'fixed' as const
        };

        // Target center
        const targetCenter = targetRect.left + (targetRect.width / 2);

        // Ideal left position (centered on target)
        let left = targetCenter - (cardWidth / 2);
        left = Math.max(padding, Math.min(left, window.innerWidth - cardWidth - padding));

        // Vertical position: Try below first
        let top = targetRect.bottom + 15;

        // If it goes off bottom, try above
        if (top + cardHeight > window.innerHeight) {
            top = targetRect.top - cardHeight - 15;
        }

        // Final safety clamp for top
        top = Math.max(padding, Math.min(top, window.innerHeight - cardHeight - padding));

        return {
            top: `${top}px`,
            left: `${left}px`,
            width: `${cardWidth}px`,
            transform: 'none',
            position: 'absolute' as const
        };
    }, [targetRect]);

    if (!activeTour || !activeStep) return null;

    return (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
            {/* Overlay with Cutout */}
            <AnimatePresence>
                {targetRect && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/70 pointer-events-auto"
                            style={{
                                clipPath: `polygon(
                                    0% 0%, 
                                    0% 100%, 
                                    ${targetRect.left}px 100%, 
                                    ${targetRect.left}px ${targetRect.top}px, 
                                    ${targetRect.right}px ${targetRect.top}px, 
                                    ${targetRect.right}px ${targetRect.bottom}px, 
                                    ${targetRect.left}px ${targetRect.bottom}px, 
                                    ${targetRect.left}px 100%, 
                                    100% 100%, 
                                    100% 0%
                                )`
                            }}
                        />
                        {/* Interaction Blocker - Blocks clicks to the highlighted element */}
                        <div
                            className="absolute z-[10000] bg-transparent pointer-events-auto cursor-not-allowed"
                            style={{
                                top: targetRect.top,
                                left: targetRect.left,
                                width: targetRect.width,
                                height: targetRect.height,
                            }}
                        />
                    </>
                )}
            </AnimatePresence>

            {/* Tooltip Card */}
            <AnimatePresence>
                <motion.div
                    key={`${activeTour}-${currentStep}`}
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{
                        opacity: 1,
                        scale: 1,
                        y: 0,
                        ...cardPos
                    }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="absolute pointer-events-auto"
                    style={{
                        zIndex: 10001,
                    }}
                >
                    <Card className="p-5 shadow-2xl border-white/20 bg-white dark:bg-slate-900 overflow-hidden relative border-2 ring-4 ring-primary/20">
                        {/* Decorative background */}
                        <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />

                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center border border-primary/20 overflow-hidden shadow-inner">
                                    <img src="/logo.png" alt="FutoraOne" className="w-[85%] h-[85%] object-contain scale-110" />
                                </div>
                                <h4 className="font-bold text-lg">{activeStep.title}</h4>
                            </div>
                            {!isMandatory && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2" onClick={endTour}>
                                    <X className="w-4 h-4" />
                                </Button>
                            )}
                        </div>

                        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                            {activeStep.content}
                        </p>

                        {activeStep.benefit && (
                            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-5">
                                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">PRO TIP</p>
                                <p className="text-sm font-medium">{activeStep.benefit}</p>
                            </div>
                        )}

                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
                            <span className="text-xs font-medium text-muted-foreground">
                                Step {currentStep + 1} of {steps.length}
                            </span>
                            <div className="flex gap-2">
                                {currentStep > 0 && !isMandatory && (
                                    <Button variant="outline" size="sm" onClick={prevStep} className="h-9">
                                        <ChevronLeft className="w-4 h-4 mr-1" /> Back
                                    </Button>
                                )}
                                <Button size="sm" onClick={nextStep} className="h-9 px-6 font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                                    {currentStep === steps.length - 1 ? "Get Started 🚀" : "Next ✨"}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

const CelebrationPopup = () => {
    const { showCelebration, setShowCelebration } = useHelpTour();
    const navigate = useNavigate();

    useEffect(() => {
        if (showCelebration) {
            // Auto redirect to feed if not already there
            if (window.location.pathname !== '/feed') {
                navigate('/feed');
            }

            // Trigger Confetti - ENSURE Z-INDEX IS HIGHER THAN POPUP (100000)
            const duration = 4 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = {
                startVelocity: 40,
                spread: 360,
                ticks: 80,
                zIndex: 110000,
                colors: ['#a855f7', '#3b82f6', '#FFFFFF', '#6366f1']
            };

            const randomInRange = (min: number, max: number) => {
                return Math.random() * (max - min) + min;
            };

            const interval: any = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 40 * (timeLeft / duration);

                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
                });
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
                });
            }, 250);

            return () => clearInterval(interval);
        }
    }, [showCelebration, navigate]);

    const triggerBlast = () => {
        const defaults = {
            startVelocity: 45,
            spread: 360,
            ticks: 100,
            zIndex: 110000,
            colors: ['#a855f7', '#3b82f6', '#FFFFFF', '#6366f1']
        };

        // Massive burst from center
        confetti({
            ...defaults,
            particleCount: 150,
            origin: { x: 0.5, y: 0.5 },
            scalar: 1.2
        });

        // Lateral bursts
        confetti({
            ...defaults,
            particleCount: 80,
            origin: { x: 0, y: 1 }
        });
        confetti({
            ...defaults,
            particleCount: 80,
            origin: { x: 1, y: 1 }
        });
    };

    // Keyboard support for celebration
    useEffect(() => {
        if (!showCelebration) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                triggerBlast();
                setTimeout(() => {
                    setShowCelebration(false);
                    navigate('/feed');
                }, 500);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showCelebration, setShowCelebration, navigate]);


    return (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/80 pointer-events-auto">
            <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="w-full max-w-sm pointer-events-auto"
            >
                <Card className="p-8 text-center bg-white border-2 border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.1)] relative overflow-hidden rounded-[2.5rem]">
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />

                    <motion.div
                        initial={{ rotate: -15, scale: 0.5 }}
                        animate={{ rotate: 0, scale: 1 }}
                        transition={{
                            type: "spring",
                            damping: 15,
                            stiffness: 200,
                            delay: 0.1
                        }}
                        className="w-24 h-24 bg-gradient-to-br from-primary to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8 relative shadow-lg rotate-3"
                    >
                        <PartyPopper className="w-12 h-12 text-white" />
                        <motion.div
                            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="absolute inset-0 rounded-3xl border-2 border-white/50"
                        />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <h1 className="text-4xl font-black mb-1 italic tracking-tighter text-slate-400">
                            WELCOME TO
                        </h1>
                        <h2 className="text-5xl font-black mb-6 italic tracking-tighter bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
                            FUTORAONE
                        </h2>
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-slate-500 text-sm font-medium leading-relaxed mb-10 px-4"
                    >
                        Your elite tech journey starts now. Build, connect, and dominate the digital landscape.
                    </motion.p>

                    <Button
                        onClick={() => {
                            triggerBlast();
                            setTimeout(() => {
                                setShowCelebration(false);
                                navigate('/feed');
                            }, 500);
                        }}
                        className="w-full h-14 rounded-2xl font-black tracking-[0.2em] bg-slate-950 text-white hover:bg-slate-900 shadow-xl transition-all hover:scale-[1.02] active:scale-95 uppercase text-xs"
                    >
                        Enter The Matrix 🚀
                    </Button>
                </Card>
            </motion.div>
        </div>
    );
};

export const GlobalTourSystem = () => {
    const { showCelebration } = useHelpTour();
    return (
        <>
            <TourController />
            <AnimatePresence>
                {showCelebration && <CelebrationPopup key="celebration-popup" />}
            </AnimatePresence>
        </>
    );
};
