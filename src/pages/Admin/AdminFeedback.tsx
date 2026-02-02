import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    MessageSquare,
    Search,
    Filter,
    Star,
    Monitor,
    Smartphone,
    Globe,
    MoreHorizontal,
    CheckCircle,
    Clock,
    Eye,
    Tag,
    AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const AdminFeedback = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [feedback, setFeedback] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("all");
    const [ratingFilter, setRatingFilter] = useState("all");
    const [featureOnly, setFeatureOnly] = useState(false);

    // Detail Dialog State
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
    const [editStatus, setEditStatus] = useState("");
    const [editNotes, setEditNotes] = useState("");
    const [saving, setSaving] = useState(false);

    const { toast } = useToast();

    useEffect(() => {
        fetchFeedback();
    }, []);

    const fetchFeedback = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("app_feedback")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setFeedback(data || []);
        } catch (error) {
            console.error("Error fetching feedback:", error);
            toast({
                title: "Error",
                description: "Failed to load feedback entries",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = (item: any) => {
        setSelectedFeedback(item);
        setEditStatus(item.status);
        setEditNotes(item.internal_notes || "");
        setIsDetailOpen(true);
    };

    const handleUpdateFeedback = async () => {
        if (!selectedFeedback) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from("app_feedback")
                .update({
                    status: editStatus,
                    internal_notes: editNotes
                })
                .eq("id", selectedFeedback.id);

            if (error) throw error;

            toast({
                title: "Updated",
                description: "Feedback status has been updated.",
            });
            setIsDetailOpen(false);
            fetchFeedback();
        } catch (error) {
            console.error("Error updating feedback:", error);
            toast({
                title: "Error",
                description: "Failed to update feedback",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'new':
                return <Badge className="bg-blue-50 text-blue-600 border-blue-100 uppercase text-[10px] font-black tracking-widest">New</Badge>;
            case 'reviewed':
                return <Badge className="bg-amber-50 text-amber-600 border-amber-100 uppercase text-[10px] font-black tracking-widest">Reviewed</Badge>;
            case 'resolved':
                return <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 uppercase text-[10px] font-black tracking-widest">Resolved</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getPlatformIcon = (platform: string) => {
        switch (platform.toLowerCase()) {
            case 'android': return <Smartphone className="w-4 h-4 text-emerald-500" />;
            case 'ios': return <Smartphone className="w-4 h-4 text-slate-400" />;
            case 'web': return <Globe className="w-4 h-4 text-blue-500" />;
            default: return <Monitor className="w-4 h-4 text-slate-400" />;
        }
    };

    const filteredFeedback = feedback.filter(item => {
        const matchesSearch =
            item.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.bug_report?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "all" || item.status === statusFilter;
        const matchesRating = ratingFilter === "all" ||
            (ratingFilter === "low" && item.rating <= 2) ||
            (ratingFilter === "high" && item.rating >= 4);

        const matchesFeature = !featureOnly || (item.feature_suggestion && item.feature_suggestion.trim().length > 0);

        return matchesSearch && matchesStatus && matchesRating && matchesFeature;
    });

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
                    <div>
                        <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-2">App Feedback</h2>
                        <p className="text-slate-500 font-medium">Monitor bug reports and feature suggestions from users.</p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant={featureOnly ? "default" : "outline"}
                            className={`gap-2 h-12 px-6 rounded-xl font-bold transition-all ${featureOnly ? 'bg-primary text-white' : 'border-slate-200 text-slate-600'}`}
                            onClick={() => setFeatureOnly(!featureOnly)}
                        >
                            <Tag className="w-4 h-4" />
                            Suggestions Only
                        </Button>
                        <Button
                            variant="outline"
                            className="gap-2 h-12 px-6 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold shadow-sm"
                            onClick={fetchFeedback}
                        >
                            <CheckCircle className="w-4 h-4" />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="md:col-span-2 relative">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <Input
                            placeholder="Search by name or content..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-14 h-14 bg-white border-slate-200 rounded-2xl focus-visible:ring-primary text-slate-900 font-medium text-lg shadow-sm"
                        />
                    </div>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-14 bg-white border-slate-200 rounded-2xl font-bold">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-slate-400" />
                                <SelectValue placeholder="Filter by Status" />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 rounded-xl">
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="reviewed">Reviewed</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={ratingFilter} onValueChange={setRatingFilter}>
                        <SelectTrigger className="h-14 bg-white border-slate-200 rounded-2xl font-bold">
                            <div className="flex items-center gap-2">
                                <Star className="w-4 h-4 text-slate-400" />
                                <SelectValue placeholder="Filter by Rating" />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 rounded-xl">
                            <SelectItem value="all">All Ratings</SelectItem>
                            <SelectItem value="low">Low (1-2 stars)</SelectItem>
                            <SelectItem value="high">High (4-5 stars)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/40">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow className="hover:bg-transparent border-slate-100">
                                <TableHead className="text-slate-400 font-black uppercase tracking-widest text-[11px] h-14 px-8">User</TableHead>
                                <TableHead className="text-slate-400 font-black uppercase tracking-widest text-[11px] h-14">Rating</TableHead>
                                <TableHead className="text-slate-400 font-black uppercase tracking-widest text-[11px] h-14">Bug Report</TableHead>
                                <TableHead className="text-slate-400 font-black uppercase tracking-widest text-[11px] h-14">Suggestion</TableHead>
                                <TableHead className="text-slate-400 font-black uppercase tracking-widest text-[11px] h-14 text-center">Platform</TableHead>
                                <TableHead className="text-slate-400 font-black uppercase tracking-widest text-[11px] h-14">Status</TableHead>
                                <TableHead className="text-right text-slate-400 font-black uppercase tracking-widest text-[11px] h-14 px-8">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-20">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                            <p className="font-bold text-slate-400 uppercase text-xs tracking-widest">Loading feedback...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredFeedback.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-20">
                                        <div className="flex flex-col items-center gap-3 opacity-30">
                                            <MessageSquare className="w-12 h-12" />
                                            <p className="font-bold text-slate-900 text-lg">No feedback found</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredFeedback.map((item) => (
                                <TableRow key={item.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="px-8 py-5">
                                        <div className="flex flex-col">
                                            <p className="font-bold text-slate-900 text-sm leading-none mb-1">{item.user_name}</p>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{item.user_email}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <span className={`font-bold text-sm ${item.rating <= 2 ? 'text-red-500' : 'text-slate-900'}`}>{item.rating}</span>
                                            <Star className={`w-3 h-3 ${item.rating <= 2 ? 'fill-red-500 text-red-500' : 'fill-amber-400 text-amber-400'}`} />
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-[200px]">
                                        <p className="text-xs text-slate-600 line-clamp-1">{item.bug_report}</p>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {item.feature_suggestion ? (
                                            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 text-[10px] uppercase font-bold">Yes</Badge>
                                        ) : (
                                            <span className="text-slate-300 text-[10px] font-bold">NO</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-center gap-2">
                                            {getPlatformIcon(item.platform)}
                                            <span className="text-[10px] font-black uppercase text-slate-400">{item.platform}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(item.status)}
                                    </TableCell>
                                    <TableCell className="text-right px-8">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-10 w-10 p-0 hover:bg-slate-100 rounded-xl transition-all"
                                            onClick={() => handleViewDetail(item)}
                                        >
                                            <Eye className="h-5 w-5 text-slate-400" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Detail Dialog */}
                <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                    <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-none rounded-3xl">
                        <div className="bg-slate-900 px-8 py-10 text-white relative">
                            <div className="flex items-center justify-between mb-4">
                                <Badge className="bg-primary/20 text-primary border-primary/30 h-8 px-4 rounded-full font-black uppercase text-[10px] tracking-widest">Feedback Detail</Badge>
                                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase">
                                    <Clock className="w-4 h-4" />
                                    {selectedFeedback && new Date(selectedFeedback.created_at).toLocaleString()}
                                </div>
                            </div>
                            <h2 className="text-3xl font-black mb-2">{selectedFeedback?.user_name}</h2>
                            <p className="text-slate-400 font-medium">{selectedFeedback?.user_email}</p>
                        </div>

                        <div className="p-8 bg-white grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="md:col-span-2 space-y-8">
                                <section>
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertCircle className="w-5 h-5 text-red-500" />
                                        <h3 className="font-black uppercase text-xs tracking-widest text-slate-400">Bug Report</h3>
                                    </div>
                                    <div className="bg-red-50/30 border border-red-50 p-6 rounded-2xl">
                                        <p className="text-slate-800 leading-relaxed font-medium">
                                            {selectedFeedback?.bug_report}
                                        </p>
                                    </div>
                                </section>

                                {selectedFeedback?.feature_suggestion && (
                                    <section>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Tag className="w-5 h-5 text-blue-500" />
                                            <h3 className="font-black uppercase text-xs tracking-widest text-slate-400">Feature Suggestion</h3>
                                        </div>
                                        <div className="bg-blue-50/30 border border-blue-50 p-6 rounded-2xl">
                                            <p className="text-slate-800 leading-relaxed font-medium">
                                                {selectedFeedback.feature_suggestion}
                                            </p>
                                        </div>
                                    </section>
                                )}

                                <section>
                                    <div className="flex items-center gap-2 mb-3">
                                        <MessageSquare className="w-5 h-5 text-slate-400" />
                                        <h3 className="font-black uppercase text-xs tracking-widest text-slate-400">Internal Admin Notes</h3>
                                    </div>
                                    <Textarea
                                        value={editNotes}
                                        onChange={(e) => setEditNotes(e.target.value)}
                                        placeholder="Add any internal processing notes here..."
                                        className="min-h-[120px] bg-slate-50 border-slate-100 rounded-2xl focus-visible:ring-primary font-medium"
                                    />
                                </section>
                            </div>

                            <div className="space-y-8">
                                <section className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                    <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400 mb-6">Device Attributes</h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-400">Platform</span>
                                            <Badge variant="outline" className="font-bold border-slate-200">{selectedFeedback?.platform}</Badge>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-400">Version</span>
                                            <span className="text-sm font-black text-slate-900">{selectedFeedback?.app_version}</span>
                                        </div>
                                        <div className="pt-2 border-t border-slate-200">
                                            <span className="text-xs font-bold text-slate-400 block mb-1">Device Info</span>
                                            <span className="text-[11px] font-medium text-slate-600 leading-tight block">{selectedFeedback?.device_info}</span>
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400 mb-4">Set Status</h3>
                                    <Select value={editStatus} onValueChange={setEditStatus}>
                                        <SelectTrigger className="w-full h-12 bg-white border-slate-200 rounded-xl font-bold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white border-slate-200">
                                            <SelectItem value="new">New</SelectItem>
                                            <SelectItem value="reviewed">Reviewed</SelectItem>
                                            <SelectItem value="resolved">Resolved</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </section>

                                <div className="pt-6">
                                    <Button
                                        onClick={handleUpdateFeedback}
                                        disabled={saving}
                                        className="w-full h-14 bg-primary text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 rounded-2xl"
                                    >
                                        {saving ? "Saving..." : "Update Feedback"}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() => setIsDetailOpen(false)}
                                        className="w-full mt-2 font-bold text-slate-400 hover:text-slate-900"
                                    >
                                        Discard Changes
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
};

export default AdminFeedback;
