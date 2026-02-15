import { useEffect } from "react";
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
import { Flag, CheckCircle, XCircle, MoreVertical, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ReportsPage = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: reports = [], isLoading } = useQuery({
        queryKey: ["admin_reports"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("reports")
                .select("*, reporter:profiles!reporter_id(username)")
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data || [];
        },
        staleTime: 1000 * 60 * 2, // 2 minutes
    });

    const actionMutation = useMutation({
        mutationFn: async ({ reportId, status }: { reportId: string, status: string }) => {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase
                .from("reports")
                .update({
                    status,
                    resolved_at: new Date().toISOString(),
                    resolved_by: user?.id
                })
                .eq("id", reportId);

            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            toast({ title: `Report ${variables.status}` });
            queryClient.invalidateQueries({ queryKey: ["admin_reports"] });
        },
        onError: (error) => {
            console.error("Error updating report:", error);
            toast({ title: "Error", description: "Failed to update report", variant: "destructive" });
        }
    });

    useEffect(() => {
        const channel = supabase
            .channel('admin-reports-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'reports' },
                () => {
                    queryClient.invalidateQueries({ queryKey: ["admin_reports"] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-2">Safety Reports</h2>
                        <p className="text-slate-500 font-medium font-mono text-sm tracking-tighter">ENVIRONMENT SCAN: {reports.length} ACTIVE SIGNALS</p>
                    </div>
                </div>

                <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/80 backdrop-blur-sm shadow-2xl shadow-slate-200/40">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow className="hover:bg-transparent border-slate-100">
                                <TableHead className="text-slate-400 font-black uppercase tracking-widest text-[10px] h-14 px-8">Safety Target</TableHead>
                                <TableHead className="text-slate-400 font-black uppercase tracking-widest text-[10px] h-14">Source Node</TableHead>
                                <TableHead className="text-slate-400 font-black uppercase tracking-widest text-[10px] h-14">Incident Data</TableHead>
                                <TableHead className="text-slate-400 font-black uppercase tracking-widest text-[10px] h-14 text-center">Protocol Status</TableHead>
                                <TableHead className="text-slate-400 font-black uppercase tracking-widest text-[10px] h-14">Timestamp</TableHead>
                                <TableHead className="text-right text-slate-400 font-black uppercase tracking-widest text-[10px] h-14 px-8">Response Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow border-none>
                                    <TableCell colSpan={6} className="text-center py-20">
                                        <div className="flex flex-col items-center gap-4">
                                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                            <p className="text-slate-400 font-mono text-xs animate-pulse">DECRYPTING INCOMING DATA...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : reports.length === 0 ? (
                                <TableRow border-none>
                                    <TableCell colSpan={6} className="text-center py-20">
                                        <div className="flex flex-col items-center gap-4 opacity-30">
                                            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                                                <CheckCircle className="w-8 h-8 text-slate-400" />
                                            </div>
                                            <p className="text-slate-400 font-mono text-xs">NO ANOMALIES DETECTED IN SECTOR.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : reports.map((report) => (
                                <TableRow key={report.id} className="border-slate-100 hover:bg-slate-50/80 transition-all duration-300">
                                    <TableCell className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <Badge variant="outline" className="text-[9px] uppercase font-black bg-slate-50 border-slate-200 text-slate-500 rounded-md tracking-tighter">{report.target_type}</Badge>
                                            <span className="text-[10px] text-slate-300 font-mono font-bold tracking-tighter">ID: {report.target_id.slice(0, 8)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-slate-800 font-black font-mono text-xs">
                                        <span className="text-slate-400">@</span>{report.reporter?.username || "SEC_LOG"}
                                    </TableCell>
                                    <TableCell className="max-w-[180px] truncate text-slate-600 font-medium text-xs leading-relaxed">
                                        {report.reason}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge
                                            className={`
                                                text-[9px] uppercase font-black tracking-widest px-2.5 py-1 rounded-full shadow-sm border
                                                ${report.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                                    report.status === 'resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                                        'bg-slate-50 text-slate-400 border-slate-200'}
                                            `}
                                        >
                                            {report.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter font-mono">
                                        {new Date(report.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </TableCell>
                                    <TableCell className="text-right px-8">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-slate-300 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"><MoreVertical size={16} /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-md border-slate-200 text-slate-900 shadow-2xl rounded-2xl p-2 min-w-[180px]">
                                                <DropdownMenuItem
                                                    onClick={() => actionMutation.mutate({ reportId: report.id, status: 'resolved' })}
                                                    disabled={actionMutation.isPending}
                                                    className="gap-3 py-3 cursor-pointer rounded-xl hover:bg-emerald-50 transition-colors"
                                                >
                                                    <CheckCircle size={16} className="text-emerald-500" />
                                                    <span className="font-bold text-xs uppercase tracking-wider text-emerald-700">Protocol: Resolve</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => actionMutation.mutate({ reportId: report.id, status: 'dismissed' })}
                                                    disabled={actionMutation.isPending}
                                                    className="gap-3 py-3 cursor-pointer rounded-xl hover:bg-slate-50 transition-colors"
                                                >
                                                    <XCircle size={16} className="text-slate-400" />
                                                    <span className="font-bold text-xs uppercase tracking-wider text-slate-500">Protocol: Dismiss</span>
                                                </DropdownMenuItem>
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
