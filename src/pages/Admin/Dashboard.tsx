import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminLayout } from "@/components/AdminLayout";
import {
    Users,
    TrendingUp,
    Activity,
    DollarSign,
    ArrowUpRight,
    CheckCircle,
    MoreHorizontal,
    FileText,
    Briefcase
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        userCount: 0,
        postCount: 0,
        projectCount: 0,
        reportCount: 0
    });
    const [recentUsers, setRecentUsers] = useState<any[]>([]);
    const [growthData, setGrowthData] = useState<any[]>([]);
    const [verificationData, setVerificationData] = useState<any[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const { count: userCount } = await supabase.from("profiles").select("*", { count: 'exact', head: true });
            const { count: postCount } = await supabase.from("posts").select("*", { count: 'exact', head: true });
            const { count: projectCount } = await supabase.from("projects").select("*", { count: 'exact', head: true });
            const { count: reportCount } = await supabase.from("reports" as any).select("*", { count: 'exact', head: true });

            const { data: users } = await supabase
                .from("profiles")
                .select("id, username, full_name, avatar_url, created_at, is_verified")
                .order("created_at", { ascending: false });

            if (users) {
                setStats({
                    userCount: userCount || 0,
                    postCount: postCount || 0,
                    projectCount: projectCount || 0,
                    reportCount: reportCount || 0
                });

                setRecentUsers(users.slice(0, 5));

                const growthMap = new Map();
                users.slice(0, 100).forEach(user => {
                    const date = new Date(user.created_at);
                    const monthYear = date.toLocaleString('default', { month: 'short', year: '2-digit' });
                    growthMap.set(monthYear, (growthMap.get(monthYear) || 0) + 1);
                });

                const growthChart = Array.from(growthMap, ([name, value]) => ({ name, users: value })).reverse();
                if (growthChart.length === 0) {
                    growthChart.push({ name: new Date().toLocaleString('default', { month: 'short' }), users: 0 });
                }
                setGrowthData(growthChart);

                const verifiedCount = users.filter(u => u.is_verified).length;
                const unverifiedCount = users.length - verifiedCount;
                setVerificationData([
                    { name: 'Verified', value: verifiedCount, color: '#3b82f6' },
                    { name: 'Unverified', value: unverifiedCount, color: '#94a3b8' },
                ]);
            }
        } catch (error) {
            console.error("Error fetching admin stats:", error);
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-10 pb-20">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                        <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-2">Dashboard</h2>
                        <p className="text-slate-500 font-medium italic">Overview of your application activity.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Total Users"
                        value={stats.userCount}
                        icon={<Users size={20} />}
                        color="bg-blue-50 text-blue-600 border-blue-100"
                    />
                    <StatCard
                        title="Total Posts"
                        value={stats.postCount}
                        icon={<FileText size={20} />}
                        color="bg-purple-50 text-purple-600 border-purple-100"
                    />
                    <StatCard
                        title="Total Projects"
                        value={stats.projectCount}
                        icon={<Briefcase size={20} />}
                        color="bg-emerald-50 text-emerald-600 border-emerald-100"
                    />
                    <StatCard
                        title="Pending Reports"
                        value={stats.reportCount}
                        icon={<Activity size={20} />}
                        color="bg-red-50 text-red-600 border-red-100"
                    />
                </div>

                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
                    <Card className="col-span-4 shadow-xl shadow-slate-200/40 border-slate-200 rounded-3xl overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                            <CardTitle className="text-slate-900 font-black uppercase tracking-widest text-xs">User Growth</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={growthData}>
                                        <defs>
                                            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} className="text-[10px] font-bold text-slate-400" />
                                        <YAxis axisLine={false} tickLine={false} className="text-[10px] font-bold text-slate-400" />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="col-span-3 shadow-xl shadow-slate-200/40 border-slate-200 rounded-3xl overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                            <CardTitle className="text-slate-900 font-black uppercase tracking-widest text-xs">Verification Status</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={verificationData}
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={8}
                                            dataKey="value"
                                        >
                                            {verificationData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex flex-col gap-3 mt-6">
                                {verificationData.map((entry, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                            <span className="text-xs font-bold text-slate-600">{entry.name}</span>
                                        </div>
                                        <span className="text-sm font-black text-slate-900">{entry.value}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="shadow-xl shadow-slate-200/40 border-slate-200 rounded-3xl overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between">
                        <CardTitle className="text-slate-900 font-black uppercase tracking-widest text-xs">Recent Users</CardTitle>
                        <Button variant="ghost" size="sm" className="font-bold text-xs text-primary bg-primary/5 hover:bg-primary/10 rounded-lg px-4" onClick={() => navigate("/admin/users")}>
                            View All Users
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-100">
                            {recentUsers.map((user) => (
                                <div key={user.id} className="flex items-center justify-between p-6 hover:bg-slate-50/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="w-12 h-12 border-2 border-slate-100 group-hover:border-primary transition-all">
                                            <AvatarImage src={user.avatar_url} />
                                            <AvatarFallback className="bg-slate-100 text-slate-900 text-xs font-black">
                                                {user.username?.[0]?.toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-bold text-slate-900">{user.full_name || user.username || "Anonymous"}</p>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">@{user.username}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        {user.is_verified && (
                                            <Badge className="bg-blue-50 text-blue-600 border-blue-100 font-black text-[10px] uppercase tracking-widest px-3 py-1">Verified</Badge>
                                        )}
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">
                                            {new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
};

const StatCard = ({ title, value, icon, color }: { title: string; value: string | number; icon: React.ReactNode; color: string }) => (
    <Card className="shadow-xl shadow-slate-200/30 border-slate-200 rounded-3xl overflow-hidden group hover:shadow-primary/5 transition-all">
        <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl ${color} shadow-sm transition-transform group-hover:scale-110 duration-500`}>
                    {icon}
                </div>
                <div className="h-1 w-8 bg-slate-100 rounded-full" />
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{title}</p>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h3>
            </div>
        </CardContent>
    </Card>
);

export default AdminDashboard;
