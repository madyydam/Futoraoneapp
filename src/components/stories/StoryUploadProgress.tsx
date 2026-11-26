import { motion } from "framer-motion";

interface StoryUploadProgressProps {
  progress: number;
  stage?: string;
}

export const StoryUploadProgress = ({ progress, stage = "Uploading story..." }: StoryUploadProgressProps) => {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="fixed inset-0 z-[1000000] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-4 select-none">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        className="flex flex-col items-center"
      >
        {/* Circular Progress Ring */}
        <div className="relative w-36 h-36 flex items-center justify-center">
          {/* Subtle Outer Glow */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#f09433]/20 via-[#e6683c]/20 to-[#bc1888]/20 blur-xl animate-pulse" />

          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 120 120">
            {/* Background Track */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke="currentColor"
              strokeWidth="6"
              fill="transparent"
              className="text-white/10"
            />
            {/* Animated Progress Gradient Ring */}
            <defs>
              <linearGradient id="instaStoryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f09433" />
                <stop offset="50%" stopColor="#e6683c" />
                <stop offset="100%" stopColor="#bc1888" />
              </linearGradient>
            </defs>
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke="url(#instaStoryGrad)"
              strokeWidth="7"
              strokeLinecap="round"
              fill="transparent"
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: strokeDashoffset,
                transition: "stroke-dashoffset 0.15s ease-out",
              }}
            />
          </svg>

          {/* Center Percentage Display */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-black text-white tracking-tight">
              {Math.round(progress)}
              <span className="text-lg font-bold text-pink-400">%</span>
            </span>
          </div>
        </div>

        {/* Status Text */}
        <motion.div
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="mt-6 text-center"
        >
          <p className="text-white font-semibold text-base tracking-wide">
            {stage}
          </p>
          <p className="text-xs text-white/50 mt-1">
            Visible to followers for 24 hours
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};
