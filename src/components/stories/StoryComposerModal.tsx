import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Palette,
  Maximize2,
  Minimize2,
  Send,
  Sparkles,
  Trash2,
  Check,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { StoryUploadProgress } from "./StoryUploadProgress";
import imageCompression from "browser-image-compression";

export interface BackgroundPreset {
  id: string;
  name: string;
  bgClass: string;
  previewColor: string;
}

export const BG_PRESETS: BackgroundPreset[] = [
  {
    id: "midnight",
    name: "Midnight",
    bgClass: "bg-gradient-to-b from-[#18181b] via-[#09090b] to-black",
    previewColor: "#09090b",
  },
  {
    id: "sunset",
    name: "Instagram Sunset",
    bgClass: "bg-gradient-to-tr from-[#f09433] via-[#bc1888] to-[#285AEB]",
    previewColor: "#e6683c",
  },
  {
    id: "cyberpunk",
    name: "Cyber Neon",
    bgClass: "bg-gradient-to-tr from-[#8a2387] via-[#e94057] to-[#f27121]",
    previewColor: "#e94057",
  },
  {
    id: "aurora",
    name: "Deep Aurora",
    bgClass: "bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950",
    previewColor: "#4f46e5",
  },
  {
    id: "emerald",
    name: "Emerald Noir",
    bgClass: "bg-gradient-to-tr from-emerald-950 via-teal-900 to-black",
    previewColor: "#065f46",
  },
  {
    id: "blur",
    name: "Atmospheric Blur",
    bgClass: "bg-black/90",
    previewColor: "#3f3f46",
  },
];

interface StoryComposerModalProps {
  file: File;
  currentUser: {
    id: string;
    username?: string | null;
    avatar_url?: string | null;
  };
  onClose: () => void;
  onStoryPublished: () => void;
}

export const StoryComposerModal = ({
  file,
  currentUser,
  onClose,
  onStoryPublished,
}: StoryComposerModalProps) => {
  const [previewUrl] = useState<string>(() => URL.createObjectURL(file));
  const [caption, setCaption] = useState("");
  const [selectedBg, setSelectedBg] = useState<string>("midnight");
  const [fitMode, setFitMode] = useState<"contain" | "cover">("contain");
  const [showBgPicker, setShowBgPicker] = useState(false);

  // Uploading state with percentage ring
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState("Preparing story...");

  const { toast } = useToast();
  const isVideo = file.type.startsWith("video");

  const activePreset = useMemo(
    () => BG_PRESETS.find((p) => p.id === selectedBg) || BG_PRESETS[0],
    [selectedBg]
  );

  const handlePublishStory = useCallback(async () => {
    if (!file || !currentUser?.id) return;

    setUploading(true);
    setUploadProgress(10);
    setUploadStage("Preparing media...");
    let uploadedPath: string | null = null;

    try {
      let uploadFile: File = file;

      if (!isVideo) {
        setUploadStage("Optimizing quality...");
        setUploadProgress(25);
        try {
          uploadFile = await imageCompression(file, {
            maxSizeMB: 1.5,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            onProgress: (p) => setUploadProgress(20 + Math.round(p * 0.2)),
          });
        } catch (compressionErr) {
          console.warn("Compression skipped:", compressionErr);
        }
      }

      setUploadStage("Uploading to cloud...");
      setUploadProgress(50);

      const fileExt = uploadFile.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
      const fileName = `${currentUser.id}/${crypto.randomUUID()}.${fileExt}`;

      const progressTimer = setInterval(() => {
        setUploadProgress((prev) => (prev < 85 ? prev + 4 : prev));
      }, 120);

      const { error: uploadError } = await supabase.storage
        .from("stories")
        .upload(fileName, uploadFile, { upsert: false });

      clearInterval(progressTimer);
      if (uploadError) throw uploadError;
      uploadedPath = fileName;

      setUploadProgress(90);
      setUploadStage("Publishing story...");

      const {
        data: { publicUrl },
      } = supabase.storage.from("stories").getPublicUrl(fileName);

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours strict

      const { error: dbError } = await supabase.from("stories").insert({
        user_id: currentUser.id,
        media_url: publicUrl,
        media_type: isVideo ? "video" : "image",
        caption: caption.trim() || null,
        expires_at: expiresAt.toISOString(),
      });

      if (dbError) throw dbError;

      setUploadProgress(100);
      setUploadStage("Story published!");
      await new Promise((r) => setTimeout(r, 450));

      toast({
        title: "Story Published! ✨",
        description: "Your story is now live for your followers for 24 hours.",
      });

      onStoryPublished();
      onClose();
    } catch (err: any) {
      if (uploadedPath) {
        await supabase.storage.from("stories").remove([uploadedPath]).catch(() => {});
      }
      toast({
        title: "Upload Failed",
        description: err.message || "Could not publish story. Please try again.",
        variant: "destructive",
      });
      setUploading(false);
    }
  }, [file, currentUser, isVideo, caption, onStoryPublished, onClose, toast]);

  return (
    <>
      {/* Uploading Circular Progress Ring */}
      {uploading && (
        <StoryUploadProgress progress={uploadProgress} stage={uploadStage} />
      )}

      {/* Main Instagram Story Editor Overlay */}
      <div className="fixed inset-0 z-[999999] bg-black/95 backdrop-blur-2xl flex items-center justify-center select-none p-0 sm:p-4">
        {/* Story Phone Canvas (9:16 vertical ratio) */}
        <div className="relative w-full max-w-[420px] h-full sm:h-[92vh] sm:rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl border border-white/10">
          {/* Dynamic Background Canvas */}
          <div className={`absolute inset-0 z-0 transition-colors duration-300 ${activePreset.bgClass}`}>
            {selectedBg === "blur" && (
              <img
                src={previewUrl}
                alt="blur-bg"
                className="w-full h-full object-cover blur-3xl opacity-50 scale-125 select-none pointer-events-none"
              />
            )}
          </div>

          {/* Top Header: Discard & Canvas Controls */}
          <div className="relative z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/30 to-transparent">
            {/* Close / Discard Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={uploading}
              className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white border border-white/15 backdrop-blur-md shadow-md"
              title="Discard story"
            >
              <X className="w-5 h-5" />
            </Button>

            <div className="flex items-center gap-2">
              {/* Fit / Fill Aspect Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFitMode((m) => (m === "contain" ? "cover" : "contain"))}
                disabled={uploading}
                className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white border border-white/15 backdrop-blur-md shadow-md"
                title={fitMode === "contain" ? "Switch to Fill" : "Switch to Fit"}
              >
                {fitMode === "contain" ? (
                  <Maximize2 className="w-4 h-4 text-cyan-400" />
                ) : (
                  <Minimize2 className="w-4 h-4 text-cyan-400" />
                )}
              </Button>

              {/* Background Color / Preset Switcher Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowBgPicker((prev) => !prev)}
                disabled={uploading}
                className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white border border-white/15 backdrop-blur-md shadow-md relative"
                title="Change background color"
              >
                <Palette className="w-4 h-4 text-pink-400" />
                <span
                  className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border border-black shadow"
                  style={{ backgroundColor: activePreset.previewColor }}
                />
              </Button>
            </div>
          </div>

          {/* Background Preset Picker Tray (Expandable) */}
          <AnimatePresence>
            {showBgPicker && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="relative z-30 mx-4 p-2.5 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/15 shadow-xl flex items-center justify-between gap-2 overflow-x-auto"
              >
                {BG_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setSelectedBg(preset.id);
                      setShowBgPicker(false);
                    }}
                    className={`flex-shrink-0 w-8 h-8 rounded-full border-2 transition-transform active:scale-90 flex items-center justify-center ${
                      selectedBg === preset.id
                        ? "border-white scale-110 shadow-lg"
                        : "border-white/30 hover:border-white/70"
                    }`}
                    style={{ backgroundColor: preset.previewColor }}
                    title={preset.name}
                  >
                    {selectedBg === preset.id && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Center Stage: Media Preview Frame */}
          <div className="relative z-10 flex-1 flex items-center justify-center p-3 overflow-hidden">
            {isVideo ? (
              <video
                src={previewUrl}
                autoPlay
                loop
                muted
                playsInline
                className={`max-w-full max-h-full rounded-2xl shadow-2xl transition-all duration-200 ${
                  fitMode === "cover" ? "w-full h-full object-cover" : "object-contain border border-white/10"
                }`}
              />
            ) : (
              <img
                src={previewUrl}
                alt="Story media"
                className={`max-w-full max-h-full rounded-2xl shadow-2xl transition-all duration-200 ${
                  fitMode === "cover" ? "w-full h-full object-cover" : "object-contain border border-white/10"
                }`}
              />
            )}
          </div>

          {/* Bottom Bar: Caption Input & Instagram "Your Story" Send Button */}
          <div className="relative z-20 p-4 pb-8 sm:pb-6 bg-gradient-to-t from-black/95 via-black/70 to-transparent space-y-3.5">
            {/* Caption Input */}
            <div className="relative">
              <Input
                type="text"
                placeholder="Add a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={180}
                disabled={uploading}
                className="h-11 bg-black/60 border-white/20 text-white placeholder:text-white/45 rounded-2xl px-4 focus-visible:ring-1 focus-visible:ring-white/40 shadow-inner text-sm"
              />
              {caption.length > 0 && (
                <span className="absolute right-3 top-3 text-[10px] text-white/40 font-mono">
                  {caption.length}/180
                </span>
              )}
            </div>

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between pt-1">
              {/* Cancel Button */}
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={uploading}
                className="text-white/70 hover:text-white hover:bg-white/10 rounded-full text-xs font-medium px-3 h-9"
              >
                Cancel
              </Button>

              {/* Instagram Style "Your Story" Send Button */}
              <Button
                onClick={handlePublishStory}
                disabled={uploading}
                className="rounded-full bg-white text-black hover:bg-white/90 active:scale-95 font-semibold text-xs px-5 h-10 shadow-xl flex items-center gap-2.5 transition-all"
              >
                {/* User Avatar with Instagram Ring */}
                <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888]">
                  <Avatar className="w-5 h-5 border border-white">
                    <AvatarImage src={currentUser?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-white text-[9px] font-bold">
                      {currentUser?.username?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <span>Your Story</span>
                <Send className="w-3.5 h-3.5 ml-0.5 text-neutral-800" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
