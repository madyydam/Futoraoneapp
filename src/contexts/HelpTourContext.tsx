import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo, useRef } from "react";
import { TOURS, TourStep } from "@/config/tourConfig";

interface HelpTourContextType {
    activeTour: string | null;
    currentStep: number;
    isMandatory: boolean;
    startTour: (tourId: string, mandatory?: boolean) => void;
    nextStep: () => void;
    prevStep: () => void;
    endTour: () => void;
    registerAction: (name: string, action: () => void) => () => void;
    triggerAction: (name: string) => void;
    completedTours: string[];
    steps: TourStep[];
    showCelebration: boolean;
    setShowCelebration: (show: boolean) => void;
}

const HelpTourContext = createContext<HelpTourContextType | undefined>(undefined);

export const HelpTourProvider = ({ children }: { children: ReactNode }) => {
    const [activeTour, setActiveTour] = useState<string | null>(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [isMandatory, setIsMandatory] = useState(false);
    const [completedTours, setCompletedTours] = useState<string[]>([]);
    const [showCelebration, setShowCelebration] = useState(false);
    const actionsRef = useRef<Record<string, () => void>>({});

    useEffect(() => {
        try {
            const saved = localStorage.getItem("futora_completed_tours");
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    setCompletedTours(parsed);
                }
            }
        } catch {
            // Reset corrupted storage safely instead of crashing render
            localStorage.removeItem("futora_completed_tours");
        }
    }, []);

    const endTour = useCallback(() => {
        if (!activeTour) return;

        const tourIdToComplete = activeTour;
        if (tourIdToComplete === 'feed') {
            setShowCelebration(true);
        }

        setCompletedTours((prev) => {
            if (prev.includes(tourIdToComplete)) return prev;
            const updated = [...prev, tourIdToComplete];
            try {
                localStorage.setItem("futora_completed_tours", JSON.stringify(updated));
            } catch {
                // Ignore quota errors
            }
            return updated;
        });

        setActiveTour(null);
        setCurrentStep(0);
        setIsMandatory(false);
    }, [activeTour]);

    const startTour = useCallback((tourId: string, mandatory = false) => {
        if (!TOURS[tourId as keyof typeof TOURS]) return;
        setActiveTour(tourId);
        setCurrentStep(0);
        setIsMandatory(mandatory);
    }, []);

    const nextStep = useCallback(() => {
        if (!activeTour) return;
        const totalSteps = TOURS[activeTour as keyof typeof TOURS].steps.length;
        if (currentStep < totalSteps - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            endTour();
        }
    }, [activeTour, currentStep, endTour]);

    const prevStep = useCallback(() => {
        setCurrentStep(prev => (prev > 0 ? prev - 1 : prev));
    }, []);

    const registerAction = useCallback((name: string, action: () => void) => {
        actionsRef.current[name] = action;
        return () => {
            delete actionsRef.current[name];
        };
    }, []);

    const triggerAction = useCallback((name: string) => {
        const action = actionsRef.current[name];
        if (action) {
            action();
        }
    }, []);

    const steps = useMemo(
        () => (activeTour ? TOURS[activeTour as keyof typeof TOURS].steps : []),
        [activeTour]
    );

    const value = useMemo<HelpTourContextType>(() => ({
        activeTour,
        currentStep,
        isMandatory,
        startTour,
        nextStep,
        prevStep,
        endTour,
        registerAction,
        triggerAction,
        completedTours,
        steps,
        showCelebration,
        setShowCelebration
    }), [
        activeTour,
        currentStep,
        isMandatory,
        startTour,
        nextStep,
        prevStep,
        endTour,
        registerAction,
        triggerAction,
        completedTours,
        steps,
        showCelebration
    ]);

    return (
        <HelpTourContext.Provider value={value}>
            {children}
        </HelpTourContext.Provider>
    );
};

export const useHelpTour = () => {
    const context = useContext(HelpTourContext);
    if (context === undefined) {
        throw new Error("useHelpTour must be used within a HelpTourProvider");
    }
    return context;
};
