import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
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

    useEffect(() => {
        const saved = localStorage.getItem("futora_completed_tours");
        if (saved) {
            setCompletedTours(JSON.parse(saved));
        }
    }, []);

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
    }, [activeTour, currentStep]);

    const prevStep = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    }, [currentStep]);

    const endTour = useCallback(() => {
        if (!activeTour) return;

        console.log("Ending tour:", activeTour);
        const tourIdToComplete = activeTour;

        if (tourIdToComplete === 'feed') {
            setShowCelebration(true);
        }

        if (!completedTours.includes(tourIdToComplete)) {
            const updated = [...completedTours, tourIdToComplete];
            setCompletedTours(updated);
            localStorage.setItem("futora_completed_tours", JSON.stringify(updated));
        }

        setActiveTour(null);
        setCurrentStep(0);
        setIsMandatory(false);
    }, [activeTour, completedTours]);

    const [actions] = useState<Record<string, () => void>>({});

    const registerAction = useCallback((name: string, action: () => void) => {
        actions[name] = action;
        return () => {
            delete actions[name];
        };
    }, [actions]);

    const triggerAction = useCallback((name: string) => {
        if (actions[name]) {
            actions[name]();
        } else {
            console.warn(`Action ${name} not registered in HelpTourContext`);
        }
    }, [actions]);

    const steps = activeTour ? TOURS[activeTour as keyof typeof TOURS].steps : [];

    return (
        <HelpTourContext.Provider value={{
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
        }}>
            {children}
        </HelpTourContext.Provider>
    );
};

export const useHelpTour = () => {
    const context = useContext(HelpTourContext);
    if (!context) {
        throw new Error("useHelpTour must be used within a HelpTourProvider");
    }
    return context;
};
