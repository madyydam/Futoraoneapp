import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AVATAR_OPTIONS } from '@/utils/avatars';
import { cn } from '@/lib/utils';

export default function SelectAvatar() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);
    const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const fetchCurrentAvatar = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/auth');
                return;
            }

            setUserId(user.id);

            const { data: profile } = await supabase
                .from('profiles')
                .select('avatar_url')
                .eq('id', user.id)
                .single();

            if (profile?.avatar_url) {
                setCurrentAvatar(profile.avatar_url);
                setSelectedAvatar(profile.avatar_url);
            }
        };

        fetchCurrentAvatar();
    }, [navigate]);

    const handleSave = async () => {
        if (!userId || !selectedAvatar) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ avatar_url: selectedAvatar })
                .eq('id', userId);

            if (error) throw error;

            toast({
                title: 'Avatar updated!',
                description: 'Your profile avatar has been updated successfully.',
            });

            navigate('/profile');
        } catch (error) {
            toast({
                title: 'Error',
                description: (error as Error).message,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white p-4 sm:p-6 overflow-x-hidden">
            <div className="max-w-5xl mx-auto">
                {/* Premium Header */}
                <div className="flex items-center justify-between mb-8">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/profile')}
                        className="gap-2 hover:bg-white/10 text-white/70 hover:text-white transition-all rounded-full"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </Button>

                    <Button
                        onClick={handleSave}
                        disabled={loading || !selectedAvatar || selectedAvatar === currentAvatar}
                        className="gradient-primary px-8 rounded-full font-bold shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
                    >
                        {loading ? 'Saving...' : 'Confirm Selection'}
                    </Button>
                </div>

                {/* Hero Preview Section */}
                <div className="flex flex-col items-center mb-12 relative">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative"
                    >
                        {/* Abstract Glow Background */}
                        <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full animate-pulse" />

                        <div className="relative z-10 p-2 rounded-full bg-gradient-to-b from-white/20 to-transparent backdrop-blur-md border border-white/20 shadow-2xl">
                            <motion.div
                                key={selectedAvatar}
                                initial={{ opacity: 0, y: 20, rotateY: 90 }}
                                animate={{ opacity: 1, y: 0, rotateY: 0 }}
                                transition={{ type: "spring", damping: 15 }}
                                className="w-48 h-48 sm:w-64 sm:h-64 rounded-full overflow-hidden bg-slate-900 shadow-inner"
                            >
                                <img
                                    src={selectedAvatar || ''}
                                    alt="Hero Preview"
                                    className="w-full h-full object-cover"
                                />
                            </motion.div>
                        </div>

                        {/* 3D Label */}
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg border border-white/20 uppercase tracking-widest z-20">
                            Premium 3D
                        </div>
                    </motion.div>

                    <div className="text-center mt-10">
                        <h1 className="text-4xl font-black mb-2 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent italic">
                            ELITE PERSONAS
                        </h1>
                        <p className="text-white/40 text-sm font-medium tracking-wide uppercase">
                            Choose your high-definition 3D signature look
                        </p>
                    </div>
                </div>

                {/* Avatar Grid with Glassmorphism */}
                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 backdrop-blur-sm relative overflow-hidden mb-20">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4 relative z-10">
                        {AVATAR_OPTIONS.map((avatar) => {
                            const isSelected = selectedAvatar === avatar.url;

                            return (
                                <motion.button
                                    key={avatar.id}
                                    type="button"
                                    onClick={() => setSelectedAvatar(avatar.url)}
                                    className={cn(
                                        "relative aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-300",
                                        isSelected
                                            ? "border-primary bg-primary/20 shadow-lg shadow-primary/20 scale-110 z-20"
                                            : "border-white/5 bg-black/40 hover:border-white/20 hover:scale-105"
                                    )}
                                    whileHover={{ y: -5 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <img
                                        src={avatar.url}
                                        alt={avatar.name}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />

                                    {isSelected && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="absolute inset-0 flex items-center justify-center bg-primary/10"
                                        >
                                            <div className="bg-primary text-white rounded-full p-1 shadow-lg ring-2 ring-white/20">
                                                <Check className="w-4 h-4" />
                                            </div>
                                        </motion.div>
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
