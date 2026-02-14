import { memo, useState } from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { ImageLightbox } from "@/components/ImageLightbox";

// Internal specialized video component for lazy buffering
const PostVideo = memo(({ src, index }: { src: string; index: number }) => {
    const { ref, inView } = useInView({
        triggerOnce: true,
        rootMargin: "100px 0px", // Pre-fetch slightly before it hits viewport
    });

    return (
        <div ref={ref} className="w-full rounded-2xl mb-4 shadow-md overflow-hidden bg-muted/20 min-h-[200px] flex items-center justify-center">
            {inView ? (
                <video
                    src={src}
                    controls
                    className="w-full h-full"
                    preload={index < 2 ? "auto" : "metadata"}
                    playsInline
                />
            ) : (
                <div className="w-full h-full animate-pulse bg-muted" />
            )}
        </div>
    );
});

PostVideo.displayName = "PostVideo";

interface PostMediaProps {
    imageUrl: string | null;
    videoUrl: string | null;
    index: number;
}

export const PostMedia = memo(({ imageUrl, videoUrl, index }: PostMediaProps) => {
    const [lightboxOpen, setLightboxOpen] = useState(false);

    if (!imageUrl && !videoUrl) return null;

    return (
        <>
            {imageUrl && (
                <>
                    <motion.img
                        src={imageUrl}
                        alt="Post"
                        className="w-full rounded-2xl object-cover mb-4 cursor-pointer shadow-md"
                        loading={index < 3 ? "eager" : "lazy"}
                        // @ts-ignore - fetchpriority is a non-standard attribute for performance
                        fetchpriority={index < 3 ? "high" : "auto"}
                        decoding="async"
                        onClick={() => setLightboxOpen(true)}
                        whileHover={{ scale: 1.01 }}
                        transition={{ type: "spring", stiffness: 200 }}
                    />
                    <ImageLightbox
                        imageUrl={imageUrl}
                        isOpen={lightboxOpen}
                        onClose={() => setLightboxOpen(false)}
                    />
                </>
            )}

            {videoUrl && (
                <PostVideo
                    src={videoUrl}
                    index={index}
                />
            )}
        </>
    );
});

PostMedia.displayName = "PostMedia";
