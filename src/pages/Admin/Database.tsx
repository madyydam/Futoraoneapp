import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Database, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const TABLES = [
    "profiles",
    "posts",
    "comments",
    "likes",
    "projects",
    "notifications",
    "app_config",
    "admin_logs",
    "reports"
];

const DatabasePage = () => {
    const [selectedTable, setSelectedTable] = useState("profiles");
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [columns, setColumns] = useState<string[]>([]);
    const [page, setPage] = useState(0);
    const ROWS_PER_PAGE = 20;

    useEffect(() => {
        setPage(0);
        fetchTableData();
    }, [selectedTable]);

    useEffect(() => {
        fetchTableData();
    }, [page]);

    const fetchTableData = async () => {
        setLoading(true);
        try {
            const { data: tableData, error } = await supabase
                .from(selectedTable)
                .select("*")
                .range(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE - 1)
                .order("created_at", { ascending: false });

            if (error) throw error;

            if (tableData && tableData.length > 0) {
                // Extract columns from first row, prioritizing id and created_at
                const keys = Object.keys(tableData[0]);
                const sortedKeys = keys.sort((a, b) => {
                    if (a === 'id') return -1;
                    if (b === 'id') return 1;
                    if (a === 'created_at') return -1;
                    if (b === 'created_at') return 1;
                    return 0;
                });
                setColumns(sortedKeys);
                setData(tableData);
            } else {
                setData([]);
                setColumns([]);
            }

        } catch (error) {
            console.error(`Error fetching ${selectedTable}:`, error);
        } finally {
            setLoading(false);
        }
    };

    const formatCell = (value: any) => {
        if (value === null || value === undefined) return <span className="text-slate-300 italic">null</span>;
        if (typeof value === 'boolean') {
            return value ?
                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold">TRUE</span> :
                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-xs font-bold">FALSE</span>;
        }
        if (typeof value === 'object') return <span className="font-mono text-xs text-slate-500">{JSON.stringify(value).substring(0, 30)}...</span>;
        if (typeof value === 'string' && value.length > 50) return <span title={value}>{value.substring(0, 50)}...</span>;
        return String(value);
    };

    return (
        <AdminLayout>
            <div className="space-y-6 pb-20 h-[calc(100vh-100px)] flex flex-col">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
                    <div>
                        <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-2">Database Viewer</h2>
                        <p className="text-slate-500 font-medium italic">View and check data inside the application.</p>
                    </div>
                    <div className="flex gap-4">
                        <Select value={selectedTable} onValueChange={setSelectedTable}>
                            <SelectTrigger className="w-[200px] h-12 rounded-xl border-slate-200 font-bold bg-white text-slate-700 shadow-sm">
                                <Database className="w-4 h-4 mr-2 text-primary" />
                                <SelectValue placeholder="Select Table" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-200 rounded-xl max-h-[400px]">
                                {TABLES.map(table => (
                                    <SelectItem key={table} value={table} className="font-medium focus:bg-slate-50 cursor-pointer">
                                        {table}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => fetchTableData()}
                            className="h-12 w-12 rounded-xl border-slate-200 text-slate-500 hover:text-primary hover:bg-slate-50"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>

                <Card className="shadow-xl shadow-slate-200/40 border-slate-200 rounded-3xl overflow-hidden bg-white flex-1 flex flex-col min-h-0">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3 px-6 flex-shrink-0 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="font-black text-xs uppercase tracking-widest text-slate-400">Viewing Table:</span>
                            <span className="font-bold text-sm text-primary bg-primary/10 px-2 py-0.5 rounded-md font-mono">{selectedTable}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={page === 0 || loading}
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="text-xs font-bold text-slate-500 w-16 text-center">
                                Page {page + 1}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={data.length < ROWS_PER_PAGE || loading}
                                onClick={() => setPage(p => p + 1)}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-hidden relative">
                        {loading && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        )}
                        <ScrollArea className="h-full w-full">
                            <div className="min-w-max">
                                <Table>
                                    <TableHeader className="bg-slate-50 sticky top-0 z-0 shadow-sm">
                                        <TableRow className="border-slate-100 hover:bg-transparent">
                                            {columns.map(col => (
                                                <TableHead key={col} className="font-black text-[10px] uppercase text-slate-400 tracking-wider h-10 px-4 whitespace-nowrap">
                                                    {col}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={columns.length || 1} className="h-24 text-center text-slate-400 font-medium italic">
                                                    No records found.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            data.map((row, i) => (
                                                <TableRow key={row.id || i} className="border-slate-100 hover:bg-slate-50/50 transition-colors group">
                                                    {columns.map(col => (
                                                        <TableCell key={`${row.id}-${col}`} className="font-medium text-slate-700 text-xs px-4 py-3 max-w-[300px] truncate border-r border-transparent group-hover:border-slate-100 last:border-r-0">
                                                            {formatCell(row[col])}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
};

export default DatabasePage;
