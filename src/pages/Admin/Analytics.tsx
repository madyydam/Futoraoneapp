import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUpRight, MessageCircle, Heart, Users } from "lucide-react";

const AnalyticsPage = () => {
    const [engagementData, setEngagementData] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalLikes: 0,
        totalComments: 0,
        activeUsers: 0,
        growthRate: 0
    });

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            // 1. Fetch Likes with dates
            const { data: likes } = await supabase
                .from("likes")
                .select("created_at")
                .order("created_at", { ascending: true });

            // 2. Fetch Comments with dates
            const { data: comments } = await supabase
                .from("comments")
                .select("created_at")
                .order("created_at", { ascending: true });

            // --- Aggregation Logic for Engagement ---
            const engagementMap = new Map();

            const initEntry = (dateKey: string) => {
                if (!engagementMap.has(dateKey)) {
                    engagementMap.set(dateKey, { name: dateKey, likes: 0, comments: 0 });
                }
            };

            likes?.forEach(like => {
                const dateKey = new Date(like.created_at).toLocaleDateString('default', { day: '2-digit', month: 'short' });
                initEntry(dateKey);
                engagementMap.get(dateKey).likes++;
            });

            comments?.forEach(comment => {
                const dateKey = new Date(comment.created_at).toLocaleDateString('default', { day: '2-digit', month: 'short' });
                initEntry(dateKey);
                engagementMap.get(dateKey).comments++;
            });

            const engagementChart = Array.from(engagementMap.values()).slice(-14); // Last 14 days
            setEngagementData(engagementChart);
            setStats(prev => ({
                ...prev,
                totalLikes: likes?.length || 0,
                totalComments: comments?.length || 0
            }));

        } catch (error) {
            console.error("Error fetching analytics:", error);
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-10 pb-20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-2">Analytics</h2>
                        <p className="text-slate-500 font-medium italic">Performance metrics and growth trends.</p>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    <Card className="shadow-lg shadow-slate-200/50 border-slate-200 rounded-3xl overflow-hidden bg-white group hover:shadow-xl transition-all">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50">
                            <CardTitle className="text-sm font-black text-slate-500 uppercase tracking-wider">Total Likes</CardTitle>
                            <Heart className="h-4 w-4 text-rose-500" />
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="text-4xl font-black text-slate-900 mb-1">{stats.totalLikes.toLocaleString()}</div>
                            <div className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-lg">
                                <ArrowUpRight className="h-3 w-3 mr-1" />
                                +12% this week
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-lg shadow-slate-200/50 border-slate-200 rounded-3xl overflow-hidden bg-white group hover:shadow-xl transition-all">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50">
                            <CardTitle className="text-sm font-black text-slate-500 uppercase tracking-wider">Total Comments</CardTitle>
                            <MessageCircle className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="text-4xl font-black text-slate-900 mb-1">{stats.totalComments.toLocaleString()}</div>
                            <div className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-lg">
                                <ArrowUpRight className="h-3 w-3 mr-1" />
                                +5% this week
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-lg shadow-slate-200/50 border-slate-200 rounded-3xl overflow-hidden bg-white group hover:shadow-xl transition-all">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50">
                            <CardTitle className="text-sm font-black text-slate-500 uppercase tracking-wider">Daily Activity</CardTitle>
                            <Users className="h-4 w-4 text-purple-500" />
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="text-4xl font-black text-slate-900 mb-1">
                                {Math.round((stats.totalLikes + stats.totalComments) / 30).toLocaleString()}
                            </div>
                            <p className="text-xs font-bold text-slate-400 mt-1">
                                Avg. interactions per day
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-1">
                    <Card className="col-span-1 shadow-xl shadow-slate-200/40 border-slate-200 rounded-3xl overflow-hidden bg-white">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                            <CardTitle className="text-lg font-black text-slate-900">Engagement Trends</CardTitle>
                            <CardDescription className="text-slate-500 font-medium">Daily social interactions over the last 2 weeks.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="h-[400px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={engagementData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorComments" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis
                                            dataKey="name"
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#fff',
                                                borderRadius: '16px',
                                                border: '1px solid #e2e8f0',
                                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                            }}
                                            itemStyle={{ fontWeight: 'bold' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="likes"
                                            stroke="#f43f5e"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorLikes)"
                                            name="Likes"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="comments"
                                            stroke="#3b82f6"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorComments)"
                                            name="Comments"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AnalyticsPage;
