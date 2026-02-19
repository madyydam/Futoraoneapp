import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Plus, Users, Globe, Lock, EyeOff,
    Upload, Check, ChevronRight, ChevronLeft,
    Sparkles, Rocket
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import imageCompression from 'browser-image-compression';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type PrivacyType = 'public' | 'private' | 'hidden';

interface CreateGroupDialogProps {
    onGroupCreated?: () => void;
    trigger?: React.ReactNode;
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

const STEPS = ['Basic Info', 'Privacy', 'Launch'];

const StepIndicator = ({ current }: { current: number }) => (
    <div className="flex items-center justify-center gap-0 mb-6">
        {STEPS.map((label, i) => (
            <div key={i} className="flex items-center">
                <div className="flex flex-col items-center">
                    <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black transition-all duration-300 border-2",
                        i < current
                            ? "bg-primary border-primary text-white"
                            : i === current
                                ? "bg-white dark:bg-card border-primary text-primary shadow-md shadow-primary/20"
                                : "bg-muted/50 border-border text-muted-foreground"
                    )}>
                        {i < current ? <Check className="w-3.5 h-3.5" /> : i + 1}
                    </div>
                    <span className={cn(
                        "text-[10px] font-bold mt-1 uppercase tracking-wide",
                        i === current ? "text-primary" : "text-muted-foreground/60"
                    )}>{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                    <div className={cn(
                        "w-12 h-0.5 mx-1 mb-4 transition-all duration-500",
                        i < current ? "bg-primary" : "bg-border"
                    )} />
                )}
            </div>
        ))}
    </div>
);

// ─── Privacy Option Card ──────────────────────────────────────────────────────

const PrivacyCard = ({ type, selected, onClick }: {
    type: PrivacyType;
    selected: boolean;
    onClick: () => void;
}) => {
    const configs: Record<PrivacyType, { icon: React.ReactNode; label: string; desc: string; color: string }> = {
        public: {
            icon: <Globe className="w-5 h-5" />,
            label: 'Public',
            desc: 'Anyone can find and join',
            color: 'text-emerald-600 dark:text-emerald-400',
        },
        private: {
            icon: <Lock className="w-5 h-5" />,
            label: 'Private',
            desc: 'Invite-only, visible in search',
            color: 'text-amber-600 dark:text-amber-400',
        },
        hidden: {
            icon: <EyeOff className="w-5 h-5" />,
            label: 'Hidden',
            desc: 'Not searchable, invite-only',
            color: 'text-rose-600 dark:text-rose-400',
        },
    };
    const cfg = configs[type];

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200",
                selected
                    ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                    : "border-border hover:border-primary/40 hover:bg-muted/30"
            )}
        >
            <div className={cn("flex-shrink-0", cfg.color)}>{cfg.icon}</div>
            <div className="flex-1 min-w-0">
                <p className={cn("font-bold text-[14px]", selected ? "text-primary" : "text-foreground")}>
                    {cfg.label}
                </p>
                <p className="text-[11px] text-muted-foreground">{cfg.desc}</p>
            </div>
            <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                selected ? "border-primary bg-primary" : "border-muted-foreground/30"
            )}>
                {selected && <Check className="w-3 h-3 text-white" />}
            </div>
        </button>
    );
};

// ─── Slide animation variants ─────────────────────────────────────────────────

const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function CreateGroupDialog({ onGroupCreated, trigger }: CreateGroupDialogProps) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(0);
    const [direction, setDirection] = useState(1);
    const [loading, setLoading] = useState(false);

    // Step 1
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [iconFile, setIconFile] = useState<File | null>(null);
    const [iconPreview, setIconPreview] = useState<string | null>(null);

    // Step 2
    const [privacy, setPrivacy] = useState<PrivacyType>('public');

    const resetForm = () => {
        setStep(0);
        setDirection(1);
        setName('');
        setDescription('');
        setIconFile(null);
        setIconPreview(null);
        setPrivacy('public');
    };

    const handleClose = (v: boolean) => {
        setOpen(v);
        if (!v) resetForm();
    };

    const goNext = () => {
        setDirection(1);
        setStep(s => s + 1);
    };

    const goBack = () => {
        setDirection(-1);
        setStep(s => s - 1);
    };

    const handleIconChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIconFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setIconPreview(reader.result as string);
        reader.readAsDataURL(file);
    }, []);

    const handleCreate = async () => {
        if (!name.trim()) return;
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Upload avatar
            let avatarUrl: string | null = null;
            if (iconFile) {
                let compressed = iconFile;
                try {
                    compressed = await imageCompression(iconFile, { maxSizeMB: 0.5, maxWidthOrHeight: 500, useWebWorker: true });
                } catch { /* use original */ }

                const ext = compressed.name.split('.').pop();
                const path = `${user.id}/group_${Date.now()}.${ext}`;
                const { error: uploadErr } = await supabase.storage
                    .from('post_images').upload(path, compressed, { upsert: true, contentType: compressed.type });

                if (!uploadErr) {
                    const { data: { publicUrl } } = supabase.storage.from('post_images').getPublicUrl(path);
                    avatarUrl = publicUrl;
                }
            }

            // Create group
            const { data: group, error: groupErr } = await supabase
                .from('groups' as any)
                .insert({
                    name: name.trim(),
                    description: description.trim() || null,
                    avatar_url: avatarUrl,
                    is_public: privacy === 'public',
                    created_by: user.id,
                })
                .select().single();

            if (groupErr) throw groupErr;

            // Add creator as admin
            const { error: memberErr } = await supabase
                .from('group_members' as any)
                .insert({ group_id: (group as any).id, user_id: user.id, role: 'admin' });

            if (memberErr) throw memberErr;

            toast.success('Group created! 🎉');
            setOpen(false);
            resetForm();
            onGroupCreated?.();
        } catch (err) {
            console.error('Error creating group:', err);
            toast.error('Failed to create group');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button size="sm" className="gap-2">
                        <Plus className="h-4 w-4" /> Create Group
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden rounded-3xl border-border/50 shadow-2xl gap-0">
                {/* Gradient Header */}
                <div className="bg-gradient-to-br from-primary via-primary/90 to-violet-600 px-6 pt-6 pb-8 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 pointer-events-none"
                        style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
                    <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-4 h-4 text-white/80" />
                        <span className="text-[11px] text-white/70 font-bold uppercase tracking-widest">New Group</span>
                    </div>
                    <h2 className="text-xl font-black text-white">
                        {step === 0 && 'Set up your group'}
                        {step === 1 && 'Choose privacy'}
                        {step === 2 && 'Ready to launch?'}
                    </h2>
                    <p className="text-[12px] text-white/60 mt-0.5">
                        {step === 0 && 'Add a name, description, and avatar'}
                        {step === 1 && 'Control who can join your group'}
                        {step === 2 && 'Review everything before creating'}
                    </p>
                </div>

                <div className="px-6 pt-5 pb-6 bg-background">
                    <StepIndicator current={step} />

                    {/* Animated Step Content */}
                    <div className="overflow-hidden">
                        <AnimatePresence mode="wait" custom={direction}>
                            {step === 0 && (
                                <motion.div
                                    key="step0"
                                    custom={direction}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                                    className="space-y-4"
                                >
                                    {/* Avatar Upload */}
                                    <div className="flex flex-col items-center gap-2">
                                        <label className="relative group cursor-pointer">
                                            <Avatar className="h-20 w-20 ring-4 ring-primary/20 shadow-lg transition-transform group-hover:scale-105">
                                                <AvatarImage src={iconPreview || undefined} className="object-cover" />
                                                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-violet-500/20 text-primary">
                                                    <Users className="h-8 w-8 opacity-40" />
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Upload className="h-5 w-5" />
                                            </div>
                                            <input type="file" accept="image/*" className="hidden" onChange={handleIconChange} />
                                        </label>
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                            {iconPreview ? 'Change Avatar' : 'Add Avatar'}
                                        </p>
                                    </div>

                                    {/* Name */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="grp-name" className="text-[13px] font-bold">Group Name *</Label>
                                        <Input
                                            id="grp-name"
                                            placeholder="e.g. React Builders India"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            className="rounded-xl border-border/60 focus-visible:ring-primary/30 font-medium"
                                            maxLength={60}
                                        />
                                        <p className="text-[10px] text-muted-foreground text-right">{name.length}/60</p>
                                    </div>

                                    {/* Description */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="grp-desc" className="text-[13px] font-bold">
                                            Description <span className="font-normal text-muted-foreground">(optional)</span>
                                        </Label>
                                        <Textarea
                                            id="grp-desc"
                                            placeholder="What's this group about?"
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                            className="resize-none h-20 rounded-xl border-border/60 focus-visible:ring-primary/30 text-[14px]"
                                            maxLength={200}
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    custom={direction}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                                    className="space-y-3"
                                >
                                    <PrivacyCard type="public" selected={privacy === 'public'} onClick={() => setPrivacy('public')} />
                                    <PrivacyCard type="private" selected={privacy === 'private'} onClick={() => setPrivacy('private')} />
                                    <PrivacyCard type="hidden" selected={privacy === 'hidden'} onClick={() => setPrivacy('hidden')} />
                                </motion.div>
                            )}

                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    custom={direction}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                                    className="space-y-4"
                                >
                                    {/* Preview Card */}
                                    <div className="flex items-center gap-4 p-4 rounded-2xl border border-border/50 bg-muted/20">
                                        <Avatar className="h-14 w-14 ring-2 ring-primary/20 flex-shrink-0">
                                            <AvatarImage src={iconPreview || undefined} className="object-cover" />
                                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-violet-500/20 text-primary font-black text-xl">
                                                {name[0]?.toUpperCase() || 'G'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="font-bold text-[15px] truncate">{name}</p>
                                            <p className="text-[12px] text-muted-foreground truncate">{description || 'No description'}</p>
                                        </div>
                                    </div>

                                    {/* Summary rows */}
                                    <div className="space-y-2">
                                        {[
                                            {
                                                label: 'Privacy',
                                                value: privacy === 'public' ? '🌐 Public — anyone can join' : privacy === 'private' ? '🔒 Private — invite only' : '🙈 Hidden — not searchable',
                                            },
                                            { label: 'Your role', value: '👑 Admin' },
                                        ].map(row => (
                                            <div key={row.label} className="flex justify-between items-center py-2 border-b border-border/30">
                                                <span className="text-[12px] text-muted-foreground font-semibold">{row.label}</span>
                                                <span className="text-[13px] font-bold">{row.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Navigation Buttons */}
                    <div className={cn("flex gap-3 mt-6", step > 0 ? "justify-between" : "justify-end")}>
                        {step > 0 && (
                            <Button type="button" variant="ghost" onClick={goBack}
                                className="rounded-full gap-1.5 font-bold">
                                <ChevronLeft className="w-4 h-4" /> Back
                            </Button>
                        )}

                        {step < 2 ? (
                            <Button
                                type="button"
                                onClick={goNext}
                                disabled={step === 0 && !name.trim()}
                                className="rounded-full gap-1.5 font-bold bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90 text-white px-6 shadow-md"
                            >
                                Next <ChevronRight className="w-4 h-4" />
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={handleCreate}
                                disabled={loading}
                                className="rounded-full gap-2 font-bold bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90 text-white px-6 shadow-md"
                            >
                                {loading ? (
                                    <>Creating <span className="animate-spin">⏳</span></>
                                ) : (
                                    <><Rocket className="w-4 h-4" /> Launch Group</>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
