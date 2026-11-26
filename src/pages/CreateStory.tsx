import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, Image as ImageIcon, Sparkles, Palette } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import { StoryUploadProgress } from "@/components/stories/StoryUploadProgress";
import imageCompression from "browser-image-compression";

// Move filters outside component to avoid recreation on every render
const FILTERS = [
  { name: "None", value: "none", class: "" },
  { name: "Warm", value: "warm", class: "sepia-[0.3] contrast-[1.1]" },
  { name: "Cool", value: "cool", class: "hue-rotate-[10deg] saturate-[1.2]" },
  { name: "B&W", value: "bw", class: "grayscale" },
  { name: "Vintage", value: "vintage", class: "sepia-[0.5] contrast-[0.9]" },
];

const CreateStory = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState("Preparing story...");
  const [caption, setCaption] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState("none");

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        toast({
          title: "Invalid file type",
          description: "Please select an image or video file",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Story media must be under 25MB",
          variant: "destructive",
        });
        return;
      }
      setMediaFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  }, [toast]);

  const handleCreateStory = useCallback(async () => {
    if (!mediaFile) {
      toast({
        title: "No media selected",
        description: "Please select an image or video",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    setUploadStage("Preparing media...");
    let uploadedPath: string | null = null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let fileToUpload: File = mediaFile;

      // Image compression with progress simulation
      if (mediaFile.type.startsWith("image/")) {
        setUploadStage("Optimizing image quality...");
        setUploadProgress(25);
        try {
          const compressed = await imageCompression(mediaFile, {
            maxSizeMB: 1.5,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            onProgress: (p) => {
              setUploadProgress(20 + Math.round(p * 0.2));
            },
          });
          fileToUpload = compressed;
        } catch (compressionErr) {
          console.warn("Compression skipped, uploading original:", compressionErr);
        }
      }

      setUploadStage("Uploading to cloud...");
      setUploadProgress(45);

      // Upload media to storage
      const fileExt = fileToUpload.name.split(".").pop() || "jpg";
      const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      // Simulate progress ticks during upload
      const progressTimer = setInterval(() => {
        setUploadProgress((prev) => (prev < 85 ? prev + 5 : prev));
      }, 150);

      const { error: uploadError } = await supabase.storage
        .from("stories")
        .upload(fileName, fileToUpload, {
          cacheControl: "3600",
          upsert: false,
        });

      clearInterval(progressTimer);

      if (uploadError) throw uploadError;
      uploadedPath = fileName;

      setUploadProgress(90);
      setUploadStage("Publishing story...");

      const { data: { publicUrl } } = supabase.storage
        .from("stories")
        .getPublicUrl(fileName);

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Strict 24 hours

      // Create story row
      const { error: storyError } = await supabase.from("stories").insert({
        user_id: user.id,
        media_url: publicUrl,
        media_type: mediaFile.type.startsWith("image/") ? "image" : "video",
        caption: caption || null,
        expires_at: expiresAt.toISOString(),
      });

      if (storyError) throw storyError;

      setUploadProgress(100);
      setUploadStage("Story published!");

      // Brief delay to display 100%
      await new Promise((resolve) => setTimeout(resolve, 400));

      toast({
        title: "Story published! ✨",
        description: "Your story is live for 24 hours for your followers.",
      });

      navigate("/feed");
    } catch (error: any) {
      if (uploadedPath) {
        await supabase.storage.from("stories").remove([uploadedPath]).catch(() => {});
      }
      console.error("Error creating story:", error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to publish story.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [mediaFile, caption, toast, navigate]);

  // Memoize filter class to avoid lookup on every render
  const selectedFilterClass = useMemo(() =>
    FILTERS.find(f => f.value === selectedFilter)?.class || "",
    [selectedFilter]
  );

  const handleClear = useCallback(() => {
    setMediaFile(null);
    setPreviewUrl(null);
    setSelectedFilter("none");
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-background pb-20">
      {uploading && (
        <StoryUploadProgress progress={uploadProgress} stage={uploadStage} />
      )}
      <motion.div
        className="sticky top-0 z-10 bg-card/95 backdrop-blur-lg border-b border-border shadow-sm"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="max-w-2xl mx-auto flex items-center gap-4 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="hover:bg-muted/50 rounded-full"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold gradient-text flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Create Story
          </h1>
        </div>
      </motion.div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-card/60 backdrop-blur-sm border-border/50 overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <AnimatePresence mode="wait">
                {previewUrl ? (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="space-y-4"
                  >
                    <div className="relative aspect-[9/16] max-h-[500px] rounded-xl overflow-hidden bg-muted shadow-lg">
                      {mediaFile?.type.startsWith("image/") ? (
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className={`w-full h-full object-cover ${selectedFilterClass}`}
                        />
                      ) : (
                        <video
                          src={previewUrl}
                          controls
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    {/* Filter Options */}
                    {mediaFile?.type.startsWith("image/") && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Palette className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">Filters</span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {FILTERS.map((filter) => (
                            <motion.button
                              key={filter.value}
                              onClick={() => setSelectedFilter(filter.value)}
                              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all ${selectedFilter === filter.value
                                ? "bg-primary text-primary-foreground shadow-md"
                                : "bg-muted hover:bg-muted/80"
                                }`}
                              whileTap={{ scale: 0.95 }}
                            >
                              {filter.name}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.label
                    key="upload"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col items-center justify-center aspect-[9/16] max-h-[500px] border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group"
                    whileHover={{ scale: 1.02 }}
                  >
                    <motion.div
                      className="flex flex-col items-center"
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Upload className="w-12 h-12 text-primary mb-4 group-hover:scale-110 transition-transform" />
                      <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                    </motion.div>
                    <span className="text-sm text-muted-foreground font-medium">
                      Click to upload image or video
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      (Max 24 hours visibility)
                    </span>
                    <Input
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </motion.label>
                )}
              </AnimatePresence>

              <Textarea
                placeholder="Add a caption to engage your audience... ✨"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="bg-background/50 border-border/50 focus:border-primary text-foreground resize-none"
                rows={3}
              />

              {mediaFile && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2"
                >
                  <Button
                    onClick={handleCreateStory}
                    disabled={uploading}
                    className="flex-1 bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity shadow-md"
                  >
                    {uploading ? (
                      <motion.div
                        className="flex items-center gap-2"
                        initial={{ opacity: 0.7 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                      >
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating...
                      </motion.div>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Share Story
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleClear}
                    className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                  >
                    Clear
                  </Button>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
};

export default CreateStory;

