import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Megaphone,
    Send,
    Trash2,
    Power,
    Users,
    Clock,
    Eye,
    Plus,
    X,
    Loader2,
    ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

type BroadcastMessage = {
    id: string;
    title: string | null;
    message: string;
    type: string;
    audience: string;
    is_active: boolean;
    created_at: string;
    expires_at: string | null;
    seen_count?: number;
};

const AdminPopups = () => {
    const [messages, setMessages] = useState<BroadcastMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedPopup, setSelectedPopup] = useState<BroadcastMessage | null>(null);
    const [seenUsers, setSeenUsers] = useState<any[]>([]);
    const [loadingSeenUsers, setLoadingSeenUsers] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        title: "",
        message: "",
        type: "announcement",
        audience: "all",
        expires_at: ""
    });

    useEffect(() => {
        fetchBroadcasts();
    }, []);

    useEffect(() => {
        if (selectedPopup) {
            fetchSeenUsers(selectedPopup.id);
        } else {
            setSeenUsers([]); // Clear seen users when modal closes
        }
    }, [selectedPopup]);

    const fetchBroadcasts = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('broadcast_messages')
                .select(`
                    *,
                    seen_count:user_popup_status(count)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Format seen_count from the joined query
            const formattedData = data.map(item => ({
                ...item,
                seen_count: item.seen_count?.[0]?.count || 0
            }));

            setMessages(formattedData);
        } catch (error) {
            console.error("Error fetching broadcasts:", error);
            toast.error("Failed to load broadcasts");
        } finally {
            setLoading(false);
        }
    };

    const fetchSeenUsers = async (popupId: string) => {
        setLoadingSeenUsers(true);
        try {
            const { data, error } = await supabase
                .from('user_popup_status')
                .select(`
                    seen_at,
                    profiles (
                        username,
                        full_name,
                        avatar_url
                    )
                `)
                .eq('popup_id', popupId)
                .order('seen_at', { ascending: false });

            if (error) throw error;
            setSeenUsers(data || []);
        } catch (error) {
            console.error("Error fetching seen users:", error);
            toast.error("Failed to load user list");
        } finally {
            setLoadingSeenUsers(false);
        }
    };

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('broadcast_messages')
                .update({ is_active: !currentStatus })
                .eq('id', id);

            if (error) throw error;
            toast.success(`Broadcast ${!currentStatus ? 'activated' : 'deactivated'}`);
            fetchBroadcasts();
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure? This will permanently delete the broadcast.")) return;

        try {
            const { error } = await supabase
                .from('broadcast_messages')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success("Broadcast deleted");
            fetchBroadcasts();
        } catch (error) {
            toast.error("Failed to delete");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.message) return toast.error("Message is required");

        try {
            const { error } = await supabase
                .from('broadcast_messages')
                .insert([{
                    title: formData.title || null,
                    message: formData.message,
                    type: formData.type,
                    audience: formData.audience,
                    expires_at: formData.expires_at || null,
                    is_active: true
                }]);

            if (error) throw error;

            toast.success("Broadcast created successfully! 🚀");
            setIsCreating(false);
            setFormData({ title: "", message: "", type: "announcement", audience: "all", expires_at: "" });
            fetchBroadcasts();
        } catch (error) {
            toast.error("Failed to create broadcast");
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-8 max-w-6xl mx-auto">
                {/* Details Modal */}
                <AnimatePresence>
                    {selectedPopup && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
                            >
                                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                                            <Users size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Broadcast Reach</h2>
                                            <p className="text-slate-500 font-medium mt-1 truncate max-w-[400px]">{selectedPopup.title || selectedPopup.message.substring(0, 50) + '...'}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedPopup(null)} className="text-slate-400 hover:text-slate-900 transition-colors bg-white w-10 h-10 rounded-full flex items-center justify-center shadow-sm">
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4">
                                    {loadingSeenUsers ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                                            <Loader2 className="animate-spin text-primary w-12 h-12" />
                                            <p className="text-slate-400 font-bold uppercase tracking-tighter">Fetching audience data...</p>
                                        </div>
                                    ) : seenUsers.length === 0 ? (
                                        <div className="text-center py-20 flex flex-col items-center">
                                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                                <Users className="w-10 h-10 text-slate-200" />
                                            </div>
                                            <h3 className="text-xl font-black text-slate-400 tracking-tight">No one has seen this yet</h3>
                                            <p className="text-slate-400 font-medium">Reach will update as users open the app.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">
                                                <span>User Details</span>
                                                <span className="text-right">Seen At</span>
                                            </div>
                                            <div className="space-y-2">
                                                {seenUsers.map((item, idx) => (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: idx * 0.05 }}
                                                        key={idx}
                                                        className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-slate-200 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-12 h-12 rounded-xl bg-white overflow-hidden border border-slate-200 shadow-sm shrink-0">
                                                                {item.profiles?.avatar_url ? (
                                                                    <img src={item.profiles.avatar_url} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-lg">
                                                                        {item.profiles?.username?.[0]?.toUpperCase()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-black text-slate-900 truncate">{item.profiles?.full_name || item.profiles?.username}</p>
                                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">@{item.profiles?.username}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-[11px] font-black text-slate-500 bg-white px-3 py-1 rounded-lg border border-slate-100">
                                                            {format(new Date(item.seen_at), 'MMM dd, p')}
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="p-8 bg-slate-50 border-t border-slate-100">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                                            Total unique reach
                                        </p>
                                        <span className="text-2xl font-black text-primary bg-primary/10 px-6 py-2 rounded-2xl border border-primary/20">
                                            {seenUsers.length} <span className="text-sm">Users</span>
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 flex items-center gap-3 tracking-tighter">
                            Broadcast Hub <Megaphone className="text-primary w-10 h-10" />
                        </h1>
                        <p className="text-slate-500 font-medium text-lg pt-1">
                            Direct Founder-to-User communication engine.
                        </p>
                    </div>
                    <Button
                        onClick={() => setIsCreating(true)}
                        className="bg-black hover:bg-slate-800 text-white font-bold h-12 px-6 rounded-2xl flex items-center gap-2 shadow-xl shadow-black/10 transition-transform active:scale-95"
                    >
                        <Plus size={20} /> Create New Broadcast
                    </Button>
                </div>

                {/* Create Modal */}
                <AnimatePresence>
                    {isCreating && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="bg-white w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl"
                            >
                                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">New Broadcast</h2>
                                    <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>
                                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Message Title (Optional)</label>
                                        <Input
                                            placeholder="e.g. A personal note from founder..."
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            className="h-14 rounded-2xl border-slate-200 focus:ring-2 focus:ring-primary/20 text-lg font-semibold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Message Content (Required)</label>
                                        <Textarea
                                            placeholder="Write something impactful..."
                                            value={formData.message}
                                            onChange={e => setFormData({ ...formData, message: e.target.value })}
                                            className="min-h-[120px] rounded-2xl border-slate-200 focus:ring-2 focus:ring-primary/20 text-lg p-4"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Type</label>
                                            <select
                                                className="w-full h-14 rounded-2xl border-slate-200 bg-white px-4 font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 border"
                                                value={formData.type}
                                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                                            >
                                                <option value="info">ℹ️ Info</option>
                                                <option value="announcement">📢 Announcement</option>
                                                <option value="feature_launch">🚀 Feature Launch</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Audience</label>
                                            <select
                                                className="w-full h-14 rounded-2xl border-slate-200 bg-white px-4 font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 border"
                                                value={formData.audience}
                                                onChange={e => setFormData({ ...formData, audience: e.target.value })}
                                            >
                                                <option value="all">Every User</option>
                                                <option value="new_users">Only New Users</option>
                                                <option value="existing_users">Existing Only</option>
                                            </select>
                                        </div>
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-black text-xl rounded-2xl shadow-xl shadow-primary/25 transition-all active:scale-[0.98] gap-3"
                                    >
                                        <Send size={24} /> Blast Message
                                    </Button>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Broadcast List */}
                <div className="space-y-6">
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        Recent Broadcasts <div className="w-2 h-2 rounded-full bg-slate-200" />
                    </h2>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="animate-spin text-primary w-12 h-12" />
                            <p className="text-slate-400 font-bold uppercase tracking-tighter">Syncing messages...</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] p-20 flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg mb-6">
                                <Megaphone className="text-slate-300 w-10 h-10" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-400 tracking-tight">No broadcasts sent yet</h3>
                            <p className="text-slate-400 font-medium max-w-xs mt-2">Start a conversation with your community by creating your first broadcast.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {messages.map((msg, idx) => (
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    key={msg.id}
                                    className={`group bg-white border border-slate-100 p-6 rounded-[28px] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 ${!msg.is_active && 'opacity-60 grayscale-[0.5]'}`}
                                >
                                    <div className="flex items-start gap-5">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${msg.type === 'feature_launch' ? 'bg-purple-50 text-purple-600' :
                                            msg.type === 'announcement' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                                            }`}>
                                            {msg.type === 'feature_launch' ? <Plus size={24} /> :
                                                msg.type === 'announcement' ? <Megaphone size={24} /> : <Eye size={24} />}
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-black text-lg text-slate-900 leading-tight">
                                                    {msg.title || "Untitled Message"}
                                                </h3>
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${msg.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                    {msg.is_active ? 'Active' : 'Archived'}
                                                </span>
                                            </div>
                                            <p className="text-slate-500 font-medium text-base line-clamp-2 max-w-xl">
                                                {msg.message}
                                            </p>
                                            <div className="flex items-center gap-6 pt-2">
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-tighter">
                                                    <Clock size={14} /> Created {format(new Date(msg.created_at), 'MMM dd, p')}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-tighter">
                                                    <Users size={14} /> Audience: {msg.audience === 'all' ? 'All Users' : msg.audience === 'new_users' ? 'New Only' : 'Existing Only'}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-tighter">
                                                    <Eye size={14} /> {msg.seen_count || 0} Reached
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleToggleActive(msg.id, msg.is_active)}
                                            className={`w-12 h-12 rounded-xl transition-all ${msg.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                            title={msg.is_active ? 'Deactivate' : 'Activate'}
                                        >
                                            <Power size={20} />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(msg.id)}
                                            className="w-12 h-12 rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 transition-all"
                                            title="Delete Permanently"
                                        >
                                            <Trash2 size={20} />
                                        </Button>
                                        <div className="w-[1px] h-8 bg-slate-200 mx-2 hidden md:block" />
                                        <Button
                                            variant="ghost"
                                            onClick={() => setSelectedPopup(msg)}
                                            className="gap-2 h-12 px-4 rounded-xl text-slate-400 hover:text-slate-900 transition-all font-bold"
                                        >
                                            Details <ChevronRight size={18} />
                                        </Button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminPopups;
