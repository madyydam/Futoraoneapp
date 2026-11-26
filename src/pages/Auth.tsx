import { useState, useEffect, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
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
import { logger } from "@/lib/logger";
import { toSafeUserError } from "@/lib/errorMapper";

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
      logger.error('Error uploading photo:', error);
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
        description: toSafeUserError(error, "Could not send reset email."),
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
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedUsername = username.trim();
      const normalizedFullName = fullName.trim();

      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
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
          email: normalizedEmail,
          password,
          options: {
            captchaToken: captchaToken || undefined,
            data: {
              full_name: normalizedFullName,
              username: normalizedUsername,
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
            description: "Welcome to One Tech Community!",
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
          title: "Authentication Error",
          description: toSafeUserError(error, "Unable to sign in right now. Please try again."),
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [isLogin, email, password, fullName, username, profilePhoto, selectedAvatar, navigate, toast, uploadProfilePhoto, captchaToken]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8faff] via-[#f4f7ff] to-[#eef2ff] relative flex items-center justify-center p-4 overflow-hidden">
      {/* Lightweight Brand Ambient Tint */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.09),transparent_65%)]" />
        <div
          className="absolute inset-0 opacity-[0.3]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(37, 99, 235, 0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(37, 99, 235, 0.045) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-[400px] relative z-10"
      >
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(37,99,235,0.14),0_6px_20px_-4px_rgba(15,23,42,0.07),inset_0_1px_0_#ffffff] overflow-hidden">

          {/* Header */}
          <div className="px-6 pt-6 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50/90 border border-blue-100 flex items-center justify-center shadow-[0_2px_6px_-1px_rgba(37,99,235,0.16),inset_0_1px_0_#ffffff]">
                <Logo className="w-6 h-6" />
              </div>
              <span className="text-xs font-extrabold tracking-[0.22em] text-slate-700 uppercase">One</span>
            </div>

            <div className="flex bg-slate-100/90 p-1 rounded-full border border-slate-200/80 shadow-[inset_0_1px_3px_rgba(15,23,42,0.07)] gap-0.5">
              <button
                type="button"
                onClick={() => { setIsLogin(false); navigate("?mode=signup", { replace: true }); }}
                className={cn(
                  "px-4 py-1.5 text-[11px] font-bold rounded-full outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-all duration-200",
                  !isLogin
                    ? "bg-gradient-to-r from-primary to-blue-600 text-white shadow-[0_3px_10px_-2px_rgba(37,99,235,0.45),inset_0_1px_0_rgba(255,255,255,0.3)]"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                SIGNUP
              </button>
              <button
                type="button"
                onClick={() => { setIsLogin(true); navigate("?mode=login", { replace: true }); }}
                className={cn(
                  "px-4 py-1.5 text-[11px] font-bold rounded-full outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-all duration-200",
                  isLogin
                    ? "bg-gradient-to-r from-primary to-blue-600 text-white shadow-[0_3px_10px_-2px_rgba(37,99,235,0.45),inset_0_1px_0_rgba(255,255,255,0.3)]"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                LOGIN
              </button>
            </div>
          </div>

          <div className="px-6 pt-4 pb-6">
            {/* Headline */}
            <div className="text-center mb-5">
              <h2 className="text-[26px] sm:text-[28px] font-extrabold tracking-tight text-slate-900 leading-[1.16]">
                {isLogin ? (
                  <>
                    Welcome{" "}
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-blue-600 to-purple-600">
                      Back
                    </span>
                  </>
                ) : (
                  <>
                    The Future of{" "}
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-blue-600 to-purple-600">
                      Networking
                    </span>
                  </>
                )}
              </h2>
            </div>

            {/* 3D Tactile Google Button */}
            <GoogleSignInButton
              label="Continue with Google"
              redirectPath="/auth"
              disabled={loading}
              className="w-full h-[48px] rounded-2xl border border-slate-200/90 bg-white shadow-[0_5px_14px_-3px_rgba(15,23,42,0.08),0_2px_0_0_#e2e8f0,inset_0_1px_0_#ffffff] text-slate-800 font-semibold text-sm mb-4 hover:bg-slate-50 hover:-translate-y-0.5 active:translate-y-[1px] transition-all duration-150"
            />

            <form onSubmit={handleSubmit} className="space-y-3">
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    key="signup-fields"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-3"
                  >
                    {/* Compact Photo + Name/Username Row */}
                    <div className="flex gap-3 items-center">
                      <label htmlFor="photo-upload" className="cursor-pointer group flex-shrink-0">
                        <div className="w-[74px] h-[94px] rounded-2xl bg-blue-50/70 border-2 border-dashed border-primary/30 shadow-[inset_0_1px_3px_rgba(37,99,235,0.06)] flex flex-col items-center justify-center gap-1 group-hover:bg-blue-50 group-hover:border-primary/50 transition-colors relative overflow-hidden">
                          {photoPreview ? (
                            <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <>
                              <User className="w-5 h-5 text-primary/60" />
                              <span className="text-[9px] font-bold text-primary/70 uppercase tracking-wider">Photo</span>
                            </>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/35 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="w-4 h-4" />
                          </div>
                        </div>
                      </label>
                      <input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />

                      <div className="flex-1 space-y-2.5">
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            id="fullName"
                            placeholder="Full Name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="pl-10 h-11 rounded-xl border border-slate-200 bg-slate-50/80 text-slate-900 placeholder:text-slate-400 text-sm shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15 transition-all"
                            required
                          />
                        </div>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-mono leading-none">@</span>
                          <Input
                            id="username"
                            placeholder="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="pl-9 h-11 rounded-xl border border-slate-200 bg-slate-50/80 text-slate-900 placeholder:text-slate-400 text-sm shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15 transition-all"
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
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 rounded-xl border border-slate-200 bg-slate-50/80 text-slate-900 placeholder:text-slate-400 text-sm shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15 transition-all"
                  required
                />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(
                    "pl-10 h-11 rounded-xl border border-slate-200 bg-slate-50/80 text-slate-900 placeholder:text-slate-400 text-sm shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15 transition-all",
                    isLogin && "pr-16"
                  )}
                  required
                  minLength={6}
                />
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => { setResetEmail(email); setShowResetDialog(true); }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-primary font-semibold hover:underline"
                  >
                    Forgot?
                  </button>
                )}
              </div>

              {/* CAPTCHA Widget */}
              {import.meta.env.VITE_CAPTCHA_SITE_KEY && (
                <div className="flex justify-center scale-90 origin-center py-0.5">
                  <Turnstile
                    siteKey={import.meta.env.VITE_CAPTCHA_SITE_KEY}
                    onSuccess={(token) => setCaptchaToken(token)}
                    onError={() => setCaptchaToken(null)}
                    onExpire={() => setCaptchaToken(null)}
                    options={{ theme: 'light', size: 'flexible' }}
                  />
                </div>
              )}

              {/* 3D Tactile Primary CTA */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-primary via-blue-600 to-purple-600 hover:from-primary/95 hover:to-purple-600/95 text-white text-[15px] font-bold tracking-wide shadow-[0_10px_22px_-5px_rgba(37,99,235,0.45),0_3px_0_0_rgba(29,78,216,0.65),inset_0_1px_1px_rgba(255,255,255,0.3)] hover:shadow-[0_14px_26px_-5px_rgba(37,99,235,0.5),0_3px_0_0_rgba(29,78,216,0.65)] hover:-translate-y-0.5 active:translate-y-[2px] active:shadow-[0_4px_10px_-3px_rgba(37,99,235,0.4)] transition-all duration-150 mt-1"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isLogin ? "Sign In" : "Create My Account"}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100">
            <p className="text-[11px] text-slate-500 text-center leading-relaxed">
              By joining One, you agree to our{" "}
              <Link to="/terms" className="text-primary font-semibold hover:underline">Terms of Service</Link>
              {" "}and{" "}
              <Link to="/privacy" className="text-primary font-semibold hover:underline">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </motion.div>

      <Dialog open={showLoginErrorDialog} onOpenChange={setShowLoginErrorDialog}>
        <DialogContent className="sm:max-w-md bg-white border-slate-200 text-slate-900 shadow-2xl">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-red-500" />
            </div>
            <DialogTitle className="text-center text-xl font-bold text-slate-900">Authentication Failed</DialogTitle>
            <DialogDescription className="text-center text-base mt-2 text-slate-600">
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
        <DialogContent className="sm:max-w-md bg-white border-slate-200 text-slate-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Reset Password</DialogTitle>
            <DialogDescription className="text-slate-600">
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
