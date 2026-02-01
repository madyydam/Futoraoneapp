import { useState, useEffect, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, User, Mail, Lock, Loader2, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getRandomAvatar } from "@/utils/avatars";
import { Turnstile } from '@marsidev/react-turnstile';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get("mode") === "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(() => getRandomAvatar().url);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [showLoginErrorDialog, setShowLoginErrorDialog] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Persistent authentication check
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && window.location.pathname === "/auth") {
        navigate("/feed");
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && window.location.pathname === "/auth") {
        navigate("/feed");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Update toggle state if URL param changes
  useEffect(() => {
    setIsLogin(searchParams.get("mode") === "login");
  }, [searchParams]);

  // Auto-select random avatar on component mount for signup
  useEffect(() => {
    if (!isLogin && !selectedAvatar) {
      setSelectedAvatar(getRandomAvatar().url);
    }
  }, [isLogin, selectedAvatar]);

  const handlePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const uploadProfilePhoto = useCallback(async (userId: string): Promise<string | null> => {
    if (!profilePhoto) return null;

    try {
      const fileExt = profilePhoto.name.split('.').pop();
      const fileName = `${userId}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, profilePhoto);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  }, [profilePhoto]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
          options: { captchaToken: captchaToken || undefined }
        });

        if (error) throw error;

        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        });
        navigate("/feed");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            captchaToken: captchaToken || undefined,
            data: {
              full_name: fullName,
              username: username,
            },
            emailRedirectTo: `${window.location.origin}/feed`,
          },
        });

        if (error) throw error;

        // Upload profile photo if provided
        let avatarUrl = selectedAvatar;
        if (data.user && profilePhoto) {
          avatarUrl = await uploadProfilePhoto(data.user.id);
        }

        // Set avatar to profile
        if (data.user && avatarUrl) {
          await supabase
            .from('profiles')
            .update({ avatar_url: avatarUrl })
            .eq('id', data.user.id);
        }

        toast({
          title: "Account created!",
          description: "Welcome to FutoraOne Tech Community!",
        });
        navigate("/feed");
      }
    } catch (error: any) {
      // Check for invalid login credentials
      if (isLogin && error.message && (error.message.includes("Invalid login credentials") || error.message.includes("Invalid credentials"))) {
        setShowLoginErrorDialog(true);
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [isLogin, email, password, fullName, username, profilePhoto, selectedAvatar, navigate, toast, uploadProfilePhoto, captchaToken]);

  return (
    <div className="dark min-h-screen bg-background relative flex items-center justify-center p-4 overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-background z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background opacity-80"></div>
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[128px]"></div>
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[128px]"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: "spring", bounce: 0.3 }}
        className="w-full max-w-xl relative z-10"
      >
        <div className="bg-card/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden">
          {/* Header - Transparent & Integrated Toggle */}
          <div className="px-8 py-4 flex items-center justify-between border-b border-white/5 bg-white/5">
            <div className="flex items-center gap-2">
              <Logo className="w-7 h-7" />
              <span className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase">FutoraOne</span>
            </div>

            <div className="flex bg-black/40 p-1 rounded-full border border-white/10">
              <button
                onClick={() => { setIsLogin(false); navigate("?mode=signup", { replace: true }); }}
                className={cn("px-4 py-1.5 text-[10px] font-black rounded-full transition-all", !isLogin ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" : "text-muted-foreground hover:text-white")}
              >
                SIGNUP
              </button>
              <button
                onClick={() => { setIsLogin(true); navigate("?mode=login", { replace: true }); }}
                className={cn("px-4 py-1.5 text-[10px] font-black rounded-full transition-all", isLogin ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" : "text-muted-foreground hover:text-white")}
              >
                LOGIN
              </button>
            </div>
          </div>

          <div className="p-8 pt-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black tracking-tight text-white mb-1">
                {isLogin ? "Welcome Back!" : "New Account"}
              </h2>
              <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">
                {isLogin ? "Sign in to your tech portal" : "Join the future of networking"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    key="signup-fields"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="space-y-4"
                  >
                    {/* Compact Photo Upload & Profile Info Grid */}
                    <div className="grid grid-cols-[100px_1fr] gap-6 items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                      <div className="flex flex-col items-center gap-2">
                        <label htmlFor="photo-upload" className="cursor-pointer group block">
                          <div className="w-20 h-20 rounded-2xl border-2 border-primary/20 shadow-xl overflow-hidden bg-secondary/50 flex items-center justify-center relative">
                            {photoPreview ? (
                              <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-8 h-8 text-muted-foreground" />
                            )}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                              <Camera className="w-5 h-5" />
                            </div>
                          </div>
                        </label>
                        <span className="text-[10px] font-bold text-primary/60 uppercase tracking-wider">Add Photo</span>
                        <input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="fullName" className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Full Name</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input id="fullName" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-9 h-10 bg-black/20 border-white/5 focus:border-primary/50 text-white text-sm" required />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="username" className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Username</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">@</span>
                            <Input id="username" placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} className="pl-8 h-10 bg-black/20 border-white/5 focus:border-primary/50 text-white text-sm" required />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="name@domain.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9 h-10 bg-black/20 border-white/5 focus:border-primary/50 text-white text-sm" required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Password</Label>
                    {isLogin && <a href="#" className="text-[10px] text-primary hover:underline font-bold">Forgot?</a>}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 h-10 bg-black/20 border-white/5 focus:border-primary/50 text-white text-sm" required minLength={6} />
                  </div>
                </div>
              </div>

              {/* CAPTCHA Widget - Compact */}
              {import.meta.env.VITE_CAPTCHA_SITE_KEY && (
                <div className="flex justify-center scale-90 origin-center py-1">
                  <Turnstile
                    siteKey={import.meta.env.VITE_CAPTCHA_SITE_KEY}
                    onSuccess={(token) => setCaptchaToken(token)}
                    onError={() => setCaptchaToken(null)}
                    onExpire={() => setCaptchaToken(null)}
                    options={{ theme: 'dark', size: 'flexible' }}
                  />
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-2xl text-xs font-black tracking-widest bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-xl shadow-primary/20 transition-all hover:scale-[1.01] active:scale-95 mt-2 uppercase"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isLogin ? "Sign In to Feed" : "Create My Account"}
              </Button>
            </form>
          </div>

          <div className="px-8 py-4 bg-white/5 border-t border-white/5 transition-all">
            <p className="text-[10px] text-muted-foreground text-center leading-normal">
              By joining FutoraOne, you agree to our <span className="text-primary font-bold cursor-pointer hover:underline">Terms of Service</span> and <span className="text-primary font-bold cursor-pointer hover:underline">Privacy Policy</span>.
            </p>
          </div>
        </div>
      </motion.div>

      <Dialog open={showLoginErrorDialog} onOpenChange={setShowLoginErrorDialog}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-red-500" />
            </div>
            <DialogTitle className="text-center text-xl font-bold">Authentication Failed</DialogTitle>
            <DialogDescription className="text-center text-base mt-2">
              We couldn't find an account with those credentials. Would you like to create one instead?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center mt-4 gap-2">
            <Button variant="ghost" onClick={() => setShowLoginErrorDialog(false)}>Try Again</Button>
            <Button
              className="bg-primary text-primary-foreground font-semibold"
              onClick={() => {
                setShowLoginErrorDialog(false);
                setIsLogin(false);
                navigate("?mode=signup");
              }}
            >
              Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default memo(Auth);
