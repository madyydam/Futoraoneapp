import { memo } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface OpportunityCardProps {
    title: string;
    description: string;
    icon: React.ElementType;
    gradient: string;
    onClick: () => void;
    buttonText: string;
    buttonVariant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
    buttonClassName?: string;
    delay?: number;
    isLocked?: boolean;
    id?: string;
}

export const OpportunityCard = memo(({
    title,
    description,
    icon: Icon,
    gradient,
    onClick,
    buttonText,
    buttonVariant = "default",
    buttonClassName,
    delay = 0,
    isLocked = false,
    id
}: OpportunityCardProps) => (
    <motion.div
        id={id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        style={{ willChange: "transform, opacity" }}
    >
        <Card
            className={`${gradient} border-0 cursor-pointer overflow-hidden relative h-full hover:scale-[1.02] transition-transform duration-300`}
            onClick={onClick}
        >
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Icon size={80} />
            </div>

            {/* Lock Overlay */}
            {isLocked && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-4 text-center">
                    <div className="bg-white/10 p-3 rounded-full mb-3 backdrop-blur-md border border-white/20">
                        <Lock className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-white font-bold text-sm mb-1">Locked</p>
                    <Badge variant="secondary" className="bg-yellow-400 text-black hover:bg-yellow-500 border-0 font-bold">
                        Unlock 1000 🪙
                    </Badge>
                </div>
            )}

            <CardContent className="p-4 relative z-10 flex flex-col h-full justify-between gap-2">
                <div>
                    <h2 className="text-lg md:text-2xl font-bold mb-1 flex items-center gap-2">
                        <Icon className={`w-5 h-5 md:w-6 md:h-6 ${title === "Gig Market" ? "fill-black" : "fill-white"}`} />
                        <span className="leading-tight">{title}</span>
                    </h2>
                    <p className={`text-xs md:text-base line-clamp-3 md:line-clamp-none ${title === "Gig Market" ? "text-black/80 font-medium" : "text-white/90"}`}>
                        {description}
                    </p>
                </div>
                <Button variant={buttonVariant} size="sm" className={`mt-2 w-full md:w-fit text-xs md:text-sm h-8 ${buttonClassName}`}>
                    {buttonText}
                </Button>
            </CardContent>
        </Card>
    </motion.div>
));

OpportunityCard.displayName = "OpportunityCard";
