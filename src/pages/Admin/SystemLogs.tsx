import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Activity,
    Search,
    ShieldAlert,
    User,
    Database,
    FileText,
    Settings,
    Clock
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

// Helper to determine icon based on action
const getActionIcon = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes("delete") || act.includes("ban")) return <ShieldAlert className="text-red-500" size={16} />;
    if (act.includes("update") || act.includes("edit")) return <Settings className="text-orange-500" size={16} />;
    if (act.includes("create") || act.includes("add")) return <Database className="text-emerald-500" size={16} />;
    if (act.includes("user")) return <User className="text-blue-500" size={16} />;
    return <Activity className="text-slate-400" size={16} />;
};

const SystemLogs = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedLog, setSelectedLog] = useState<any>(null);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("admin_logs")
                .select(`
                    *,
                    profiles:admin_id (
                        username,
                        avatar_url,
                        full_name
                    )
                `)
                .order("created_at", { ascending: false })
                .limit(100);

            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error("Error fetching admin logs:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.profiles?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.id.includes(searchTerm)
    );

    return (
        <AdminLayout>
            <div className="space-y-10 pb-20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-2">Activity Log</h2>
                        <p className="text-slate-500 font-mediumitalic">View a history of all administrative actions.</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/20 max-w-2xl">
                    <div className="relative flex-1">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <Input
                            placeholder="Search logs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-14 h-14 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-slate-900 font-medium placeholder:text-slate-300 text-lg"
                        />
                    </div>
                </div>

                <Card className="shadow-xl shadow-slate-200/40 border-slate-200 rounded-3xl overflow-hidden bg-white">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                        <CardTitle className="text-slate-900 font-black uppercase tracking-widest text-xs">Recent Activities</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-10 flex justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {filteredLogs.length === 0 ? (
                                    <div className="p-10 text-center text-slate-500 italic">No logs found.</div>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <div key={log.id} className="flex items-center justify-between p-6 hover:bg-slate-50/50 transition-colors group">
                                            <div className="flex items-center gap-6">
                                                <div className="flex-shrink-0">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shadow-sm">
                                                        {getActionIcon(log.action)}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-bold text-slate-900 text-sm bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                                            {log.action}
                                                        </span>
                                                        <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                                            by <span className="text-primary font-bold">@{log.profiles?.username || 'System'}</span>
                                                        </span>
                                                    </div>
                                                    <span className="text-xs font-mono text-slate-400">{log.id}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-8">
                                                <div className="text-right hidden sm:block">
                                                    <div className="flex items-center gap-2 justify-end text-slate-500 text-xs font-bold uppercase tracking-wider">
                                                        <Clock size={12} />
                                                        {format(new Date(log.created_at), "MMM d, h:mm a")}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                                                        {format(new Date(log.created_at), "yyyy")}
                                                    </div>
                                                </div>

                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Avatar className="w-10 h-10 border-2 border-slate-100 cursor-pointer hover:border-primary transition-all">
                                                            <AvatarImage src={log.profiles?.avatar_url} />
                                                            <AvatarFallback className="bg-slate-200 text-slate-700 font-bold">
                                                                {log.profiles?.username?.[0] || "?"}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-xl bg-white rounded-3xl border-slate-200">
                                                        <DialogHeader>
                                                            <DialogTitle className="text-xl font-black text-slate-900">Log Details</DialogTitle>
                                                            <DialogDescription>
                                                                Details about this event.
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="space-y-4 mt-4">
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">User</p>
                                                                    <div className="flex items-center gap-2">
                                                                        <Avatar className="w-6 h-6">
                                                                            <AvatarImage src={log.profiles?.avatar_url} />
                                                                            <AvatarFallback>{log.profiles?.username?.[0]}</AvatarFallback>
                                                                        </Avatar>
                                                                        <span className="font-bold text-slate-900 text-sm">@{log.profiles?.username}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Time</p>
                                                                    <p className="font-bold text-slate-900 text-sm">{new Date(log.created_at).toLocaleString()}</p>
                                                                </div>
                                                            </div>

                                                            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                                                                <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-2">Technical Details</p>
                                                                <ScrollArea className="h-40 w-full rounded-md border border-slate-800 bg-slate-950/50 p-4">
                                                                    <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap break-all">
                                                                        {JSON.stringify(log.details || {}, null, 2)}
                                                                    </pre>
                                                                </ScrollArea>
                                                            </div>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
};

export default SystemLogs;
