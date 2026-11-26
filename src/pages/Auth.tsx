import { useState, useEffect, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { User, Mail, Lock, Loader2, Camera } from "lucide-react";
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
import { triggerAuthEmail } from "@/services/email.service";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

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
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSending, setResetSending] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Persistent authentication & OAuth callback check
  useEffect(() => {
    let active = true;

    const oauthError = searchParams.get("error_description") || searchParams.get("error");
    if (oauthError) {
      toast({
        title: "Google Sign-In Failed",
        description: oauthError,
        variant: "destructive",
      });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session?.user && window.location.pathname === "/auth") {
        navigate("/feed", { replace: true });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active && session?.user && window.location.pathname === "/auth") {
        navigate("/feed", { replace: true });
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [navigate, searchParams, toast]);

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
      if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
        toast({
          title: "Invalid Image",
          description: "Please select an image file under 5MB.",
          variant: "destructive",
        });
        return;
      }
      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [toast]);

  const uploadProfilePhoto = useCallback(async (userId: string): Promise<string | null> => {
    if (!profilePhoto) return null;

    try {
      const fileExt = profilePhoto.name.split('.').pop() || 'png';
      // Match storage RLS folder policy: [userId]/[filename]
      const filePath = `${userId}/avatar_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, profilePhoto, { upsert: true });

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

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setResetSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/settings`,
      });
      if (error) throw error;
      toast({
        title: "Reset Link Sent",
        description: "Check your email inbox for password recovery instructions.",
      });
      setShowResetDialog(false);
    } catch (error) {
      toast({
        title: "Reset Failed",
        description: error instanceof Error ? error.message : "Could not send reset email",
        variant: "destructive",
      });
    } finally {
      setResetSending(false);
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
          options: { captchaToken: captchaToken || undefined }
        });

        if (error) throw error;

        void triggerAuthEmail(data.user?.id, "login");

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
              avatar_url: selectedAvatar,
            },
            emailRedirectTo: `${window.location.origin}/feed`,
          },
        });

        if (error) throw error;

        if (data.session && data.user) {
          void triggerAuthEmail(data.user.id, "welcome");

          // Upload custom profile photo only when an authenticated session is active
          let avatarUrl = selectedAvatar;
          if (profilePhoto) {
            avatarUrl = await uploadProfilePhoto(data.user.id);
          }

          if (avatarUrl) {
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
        } else {
          toast({
            title: "Check your email",
            description: "We sent a confirmation link to activate your account.",
          });
          setIsLogin(true);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      // Check for invalid login credentials
      if (isLogin && errorMessage && (errorMessage.includes("Invalid login credentials") || errorMessage.includes("Invalid credentials"))) {
        setShowLoginErrorDialog(true);
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [isLogin, email, password, fullName, username, profilePhoto, selectedAvatar, navigate, toast, uploadProfilePhoto, captchaToken]);

  return (
    <div className="min-h-screen bg-[#f0f0f5] relative flex items-center justify-center p-4 overflow-hidden">

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, type: "spring", bounce: 0.25 }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="bg-white rounded-[2rem] shadow-[0_1px_2px_rgba(0,0,0,0.05),_0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden">

          {/* Header */}
          <div className="px-7 pt-7 pb-0 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-[9px] bg-black flex items-center justify-center">
                <Logo className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-black tracking-[0.18em] text-black/40 uppercase">FutoraOne</span>
            </div>

            <div className="flex bg-[#f2f2f7] p-[3px] rounded-[10px] gap-[2px]">
              <button
                onClick={() => { setIsLogin(false); navigate("?mode=signup", { replace: true }); }}
                className={cn(
                  "px-4 py-[5px] text-[12px] font-semibold rounded-[8px] transition-all duration-200",
                  !isLogin ? "bg-white text-black shadow-[0_1px_4px_rgba(0,0,0,0.12)]" : "text-[#8e8e93] hover:text-black"
                )}
              >
                Signup
              </button>
              <button
                onClick={() => { setIsLogin(true); navigate("?mode=login", { replace: true }); }}
                className={cn(
                  "px-4 py-[5px] text-[12px] font-semibold rounded-[8px] transition-all duration-200",
                  isLogin ? "bg-white text-black shadow-[0_1px_4px_rgba(0,0,0,0.12)]" : "text-[#8e8e93] hover:text-black"
                )}
              >
                Login
              </button>
            </div>
          </div>

          <div className="px-7 pt-6 pb-7">
            {/* Headline */}
            <div className="text-center mb-6">
              <h2 className="text-[26px] font-extrabold tracking-tight text-black leading-[1.18] mb-0">
                {isLogin ? (
                  <>Welcome <span className="text-[#1a56f5]">Back</span></>
                ) : (
                  <>The Future of <span className="text-[#1a56f5]">Networking</span></>
                )}
              </h2>
            </div>

            {/* Google */}
            <GoogleSignInButton
              label="Continue with Google"
              redirectPath="/auth"
              disabled={loading}
              className="w-full h-[50px] rounded-[14px] border-[1.5px] border-[#e5e5ea] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] text-black font-semibold text-[14px] mb-5 hover:bg-[#fafafa] transition-colors"
            />

            <form onSubmit={handleSubmit} className="space-y-[10px]">
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    key="signup-fields"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-[10px]"
                  >
                    {/* Photo + Name/Username row */}
                    <div className="flex gap-3 items-center">
                      <label htmlFor="photo-upload" className="cursor-pointer group flex-shrink-0">
                        <div className="w-[68px] h-[68px] rounded-[18px] bg-[#f2f2f7] border-[1.5px] border-dashed border-[#d1d1d6] flex flex-col items-center justify-center gap-1 group-hover:bg-[#e9e9ef] transition-colors relative overflow-hidden">
                          {photoPreview ? (
                            <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <>
                              <User className="w-5 h-5 text-[#b0b0b8]" />
                              <span className="text-[9px] font-bold text-[#b0b0b8] uppercase tracking-wider">Photo</span>
                            </>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="w-4 h-4" />
                          </div>
                        </div>
                      </label>
                      <input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />

                      <div className="flex-1 space-y-[10px]">
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-[#c7c7cc]" />
                          <Input
                            id="fullName"
                            placeholder="Full Name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="pl-[36px] h-[46px] rounded-[12px] border-[1.5px] border-[#e5e5ea] bg-[#fafafa] text-black placeholder:text-[#b0b0b8] text-[14px] focus:border-[#1a56f5] focus:bg-white focus:ring-2 focus:ring-[#1a56f5]/10 transition-all"
                            required
                          />
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#c7c7cc] text-[13px] font-mono leading-none">@</span>
                          <Input
                            id="username"
                            placeholder="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="pl-[30px] h-[46px] rounded-[12px] border-[1.5px] border-[#e5e5ea] bg-[#fafafa] text-black placeholder:text-[#b0b0b8] text-[14px] focus:border-[#1a56f5] focus:bg-white focus:ring-2 focus:ring-[#1a56f5]/10 transition-all"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email */}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-[#c7c7cc]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-[36px] h-[46px] rounded-[12px] border-[1.5px] border-[#e5e5ea] bg-[#fafafa] text-black placeholder:text-[#b0b0b8] text-[14px] focus:border-[#1a56f5] focus:bg-white focus:ring-2 focus:ring-[#1a56f5]/10 transition-all"
                  required
                />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-[#c7c7cc]" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-[36px] h-[46px] rounded-[12px] border-[1.5px] border-[#e5e5ea] bg-[#fafafa] text-black placeholder:text-[#b0b0b8] text-[14px] focus:border-[#1a56f5] focus:bg-white focus:ring-2 focus:ring-[#1a56f5]/10 transition-all"
                  required
                  minLength={6}
                />
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => { setResetEmail(email); setShowResetDialog(true); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#1a56f5] font-semibold hover:underline"
                  >
                    Forgot?
                  </button>
                )}
              </div>

              {/* CAPTCHA Widget */}
              {import.meta.env.VITE_CAPTCHA_SITE_KEY && (
                <div className="flex justify-center scale-90 origin-center py-1">
                  <Turnstile
                    siteKey={import.meta.env.VITE_CAPTCHA_SITE_KEY}
                    onSuccess={(token) => setCaptchaToken(token)}
                    onError={() => setCaptchaToken(null)}
                    onExpire={() => setCaptchaToken(null)}
                    options={{ theme: 'light', size: 'flexible' }}
                  />
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-[52px] rounded-[14px] bg-black hover:bg-[#1a1a1a] text-white text-[15px] font-semibold tracking-normal shadow-[0_2px_8px_rgba(0,0,0,0.14)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.18)] transition-all active:scale-[.98] mt-1 normal-case"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isLogin ? "Sign In" : "Create My Account"}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <div className="px-7 py-4 bg-[#fafafa] border-t border-[#f0f0f0]">
            <p className="text-[11px] text-[#aeaeb2] text-center leading-relaxed">
              By joining FutoraOne, you agree to our{" "}
              <a href="/terms" className="text-[#1a56f5] font-medium hover:underline">Terms of Service</a>
              {" "}and{" "}
              <a href="/privacy" className="text-[#1a56f5] font-medium hover:underline">Privacy Policy</a>.
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

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Reset Password</DialogTitle>
            <DialogDescription>
              Enter your account email and we&apos;ll send a secure password recovery link.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <Input
              type="email"
              placeholder="name@domain.com"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowResetDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={resetSending}>
                {resetSending ? "Sending..." : "Send Reset Link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default memo(Auth);
