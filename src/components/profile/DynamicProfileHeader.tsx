import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface DynamicProfileHeaderProps {
    color: string | null;
    mood?: string;
    className?: string;
}

export const DynamicProfileHeader = ({ color, mood, className }: DynamicProfileHeaderProps) => {
    const baseColor = color || "hsl(var(--primary))";

    return (
        <div className={cn("relative h-48 w-full overflow-hidden", className)}>
            {/* Base Background */}
            <div
                className="absolute inset-0 transition-colors duration-700"
                style={{ backgroundColor: baseColor }}
            />

            {/* Animated Mesh Gradients */}
            <motion.div
                className="absolute inset-0 opacity-40 mix-blend-soft-light"
                animate={{
                    background: [
                        `radial-gradient(circle at 20% 30%, white 0%, transparent 50%)`,
                        `radial-gradient(circle at 70% 60%, white 0%, transparent 50%)`,
                        `radial-gradient(circle at 30% 80%, white 0%, transparent 50%)`,
                    ]
                }}
                transition={{ duration: 10, repeat: Infinity, repeatType: "reverse" }}
            />

            <div
                className="absolute inset-0 opacity-20"
                style={{
                    backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.2) 1px, transparent 0)`,
                    backgroundSize: '24px 24px'
                }}
            />

            {/* Bottom Fade */}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />

            {/* Mood Emoji Float (Optional) */}
            {mood && (
                <motion.div
                    className="absolute right-8 bottom-8 text-4xl select-none"
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    whileHover={{ scale: 1.2, rotate: 10 }}
                >
                    {mood}
                </motion.div>
            )}

            {/* Glassmorphism Overlay */}
            <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px]" />
        </div>
    );
};
