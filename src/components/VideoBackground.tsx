import { memo } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface VideoBackgroundProps {
    videoSrc: string;
    aiGender: "female" | "male";
}

const VideoBackground = memo(({ videoSrc, aiGender }: VideoBackgroundProps) => {
    const isImage = videoSrc.match(/\.(jpeg|jpg|png|gif)$/i);

    return (
        <div className="absolute inset-0 z-0">
            <AnimatePresence mode="wait">
                {isImage ? (
                    <motion.img
                        key={videoSrc}
                        src={videoSrc}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="h-full w-full object-cover"
                        style={{ willChange: "opacity" }}
                        alt="AI Background"
                    />
                ) : (
                    <motion.video
                        key={videoSrc}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                        style={{ willChange: "opacity" }}
                        poster={aiGender === "female" ? "/ai-avatar.png" : "/arjun-avatar.png"}
                    >
                        <source src={videoSrc} type="video/mp4" />
                        Your browser does not support the video tag.
                    </motion.video>
                )}
            </AnimatePresence>
            {/* Dark Overlay for Readability */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
        </div>
    );
});

VideoBackground.displayName = "VideoBackground";
export default VideoBackground;
