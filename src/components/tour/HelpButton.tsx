import { useHelpTour } from "@/contexts/HelpTourContext";
import { Button } from "@/components/ui/button";
import { HelpCircle, ChevronRight, Info, PlayCircle } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HelpButtonProps {
    currentPageId: string;
}

export const HelpButton = ({ currentPageId }: HelpButtonProps) => {
    const { startTour, completedTours } = useHelpTour();

    const isFirstTime = !completedTours.includes(currentPageId);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    size="icon"
                    variant="ghost"
                    className="w-8 h-8 rounded-full bg-primary/5 backdrop-blur-sm border border-primary/10 hover:bg-primary/10 transition-all"
                >
                    <HelpCircle className="w-5 h-5 text-muted-foreground/70" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 p-3 rounded-2xl shadow-xl border-primary/20 backdrop-blur-lg">
                <DropdownMenuLabel className="flex items-center gap-2 text-lg">
                    <Info className="w-5 h-5 text-primary" />
                    How to use?
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    className="py-3 rounded-xl cursor-pointer hover:bg-primary/5 focus:bg-primary/5 transition-colors"
                    onClick={() => startTour(currentPageId, true)}
                >
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2 font-bold">
                            <PlayCircle className="w-4 h-4 text-primary" />
                            Start {currentPageId.charAt(0).toUpperCase() + currentPageId.slice(1)} Tour
                        </div>
                        <p className="text-xs text-muted-foreground">Quick 1-minute walkthrough</p>
                    </div>
                    <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                </DropdownMenuItem>
                <DropdownMenuItem className="py-3 mt-1 rounded-xl cursor-pointer opacity-70 hover:opacity-100 transition-opacity">
                    <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-sm">Pro Tips & Shortcuts</span>
                        <p className="text-[10px] text-muted-foreground">Master FutoraOne like a pro</p>
                    </div>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
