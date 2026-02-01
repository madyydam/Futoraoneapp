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
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Flag, CheckCircle, XCircle, MoreVertical } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ReportsPage = () => {
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("reports")
                .select("*, reporter:profiles!reporter_id(username)")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setReports(data || []);
        } catch (error) {
            console.error("Error fetching reports:", error);
            toast({
                title: "Error",
                description: "Failed to load reports",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (reportId: string, status: string) => {
        try {
            const { error } = await supabase
                .from("reports")
                .update({
                    status,
                    resolved_at: new Date().toISOString(),
                    resolved_by: (await supabase.auth.getUser()).data.user?.id
                })
                .eq("id", reportId);

            if (error) throw error;

            toast({ title: `Report ${status}` });
            fetchReports();
        } catch (error) {
            console.error("Error updating report:", error);
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-2">Safety Reports</h2>
                        <p className="text-slate-500 font-medium">Monitor and resolve user reports across the neural grid.</p>
                    </div>
                </div>

                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/40">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow className="hover:bg-transparent border-slate-100">
                                <TableHead className="text-slate-400 font-black uppercase tracking-widest text-[11px] h-14 px-8">Target</TableHead>
                                <TableHead className="text-slate-400 font-black uppercase tracking-widest text-[11px] h-14">Reporter</TableHead>
                                <TableHead className="text-slate-400 font-black uppercase tracking-widest text-[11px] h-14">Reason</TableHead>
                                <TableHead className="text-slate-400 font-black uppercase tracking-widest text-[11px] h-14">Status</TableHead>
                                <TableHead className="text-slate-400 font-black uppercase tracking-widest text-[11px] h-14">Created</TableHead>
                                <TableHead className="text-right text-slate-400 font-black uppercase tracking-widest text-[11px] h-14 px-8">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow border-none><TableCell colSpan={6} className="text-center py-12 text-slate-400 font-medium">Scanning for signals...</TableCell></TableRow>
                            ) : reports.length === 0 ? (
                                <TableRow border-none><TableCell colSpan={6} className="text-center py-12 text-slate-400 font-medium">Environment clean. No reports found.</TableCell></TableRow>
                            ) : reports.map((report) => (
                                <TableRow key={report.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <Badge variant="outline" className="text-[10px] uppercase font-black bg-slate-50 border-slate-200 text-slate-600">{report.target_type}</Badge>
                                            <span className="text-xs text-slate-400 font-mono font-bold">{report.target_id.slice(0, 8)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-slate-700 font-bold font-mono text-xs">@{report.reporter?.username}</TableCell>
                                    <TableCell className="max-w-[200px] truncate text-slate-500 font-medium">{report.reason}</TableCell>
                                    <TableCell>
                                        <Badge
                                            className={
                                                report.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100 shadow-sm' :
                                                    report.status === 'resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm' :
                                                        'bg-slate-50 text-slate-400 border-slate-200'
                                            }
                                        >
                                            {report.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-slate-400 text-xs font-bold uppercase tracking-tight">
                                        {new Date(report.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right px-8">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg"><MoreVertical size={18} /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-white border-slate-200 text-slate-900 shadow-2xl rounded-xl p-2 min-w-[160px]">
                                                <DropdownMenuItem onClick={() => handleAction(report.id, 'resolved')} className="gap-3 py-2.5 cursor-pointer rounded-lg hover:bg-slate-50 transition-colors"><CheckCircle size={16} className="text-emerald-500" /> <span className="font-bold text-sm">Mark Resolved</span></DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleAction(report.id, 'dismissed')} className="gap-3 py-2.5 cursor-pointer rounded-lg hover:bg-slate-50 transition-colors"><XCircle size={16} className="text-slate-300" /> <span className="font-bold text-sm text-slate-500">Dismiss</span></DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </AdminLayout>
    );
};

export default ReportsPage;
