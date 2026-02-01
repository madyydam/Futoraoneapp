import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard,
    Users,
    Shield,
    BarChart3,
    Settings,
    LogOut,
    Menu,
    Bell,
    Search,
    X,
    CreditCard,
    Activity,
    Database,
    HelpCircle,
    Flag,
    Home,
    Coins
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AdminLayoutProps {
    children: React.ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [adminProfile, setAdminProfile] = useState<any>(null);
    const location = useLocation();
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
        const getProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                setAdminProfile(data);
            }
        };
        getProfile();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/auth");
        toast({
            title: "Logged out",
            description: "You have been logged out successfully",
        });
    };

    const navItems = [
        { icon: LayoutDashboard, label: "Dashboard", path: "/admin", category: "Main" },
        { icon: Users, label: "Users", path: "/admin/users", category: "Main" },
        { icon: Coins, label: "User Coins", path: "/admin/coins", category: "Management" },
        { icon: Bell, label: "Broadcast", path: "/admin/notifications", category: "Management" },
        { icon: Shield, label: "Moderation", path: "/admin/moderation", category: "Safety" },
        { icon: Flag, label: "Reports", path: "/admin/reports", category: "Safety" },
        { icon: CreditCard, label: "Finance", path: "/admin/finance", category: "Management" },
        { icon: Activity, label: "Activity Logs", path: "/admin/logs", category: "Management" },
        { icon: BarChart3, label: "Analytics", path: "/admin/analytics", category: "Management" },
        { icon: Database, label: "Database", path: "/admin/database", category: "Tools" },
        { icon: Settings, label: "Settings", path: "/admin/settings", category: "Tools" },
    ];

    const groupedNavItems = navItems.reduce((acc: any, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {});

    return (
        <div className="min-h-screen bg-[#F8F9FC] text-slate-900 flex overflow-hidden font-sans">
            {/* Sidebar */}
            <motion.aside
                initial={{ width: 280 }}
                animate={{ width: isSidebarOpen ? 280 : 80 }}
                className="hidden md:flex flex-col border-r border-slate-200 bg-white shadow-xl shadow-slate-200/50 fixed h-full z-30 transition-shadow"
            >
                <div className="p-7 flex items-center justify-between">
                    <AnimatePresence mode="wait">
                        {isSidebarOpen ? (
                            <motion.div
                                key="logo-full"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex items-center gap-3"
                                onClick={() => navigate("/")}
                            >
                                <img src="/app-icon.png" alt="FO Admin" className="w-10 h-10 rounded-xl shadow-lg shadow-black/30 cursor-pointer object-cover bg-black" />
                                <h1 className="text-xl font-extrabold tracking-tight text-slate-900 whitespace-nowrap">
                                    FO Admin <span className="text-primary text-2xl">.</span>
                                </h1>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="logo-small"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="w-10 h-10 rounded-xl bg-black border border-slate-200 shadow-sm flex items-center justify-center mx-auto overflow-hidden"
                            >
                                <img src="/app-icon.png" alt="FO" className="w-full h-full object-cover" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-2 space-y-6 scrollbar-hide">
                    {Object.entries(groupedNavItems).map(([category, items]: [string, any]) => (
                        <div key={category} className="space-y-1">
                            {isSidebarOpen && (
                                <p className="px-4 text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-2">
                                    {category}
                                </p>
                            )}
                            {items.map((item: any) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link to={item.path} key={item.path}>
                                        <Button
                                            variant="ghost"
                                            className={`w-full justify-start gap-4 h-12 px-4 mb-1 rounded-xl transition-all group ${isActive
                                                ? "bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary/90"
                                                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                                }`}
                                        >
                                            <item.icon size={20} className={`${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-900"} transition-colors`} />
                                            {isSidebarOpen && <span className="font-semibold text-sm">{item.label}</span>}
                                        </Button>
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100">
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 h-12 px-4 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                        onClick={handleLogout}
                    >
                        <LogOut size={20} />
                        {isSidebarOpen && <span className="text-sm font-bold">Log Out</span>}
                    </Button>
                </div>
            </motion.aside>

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col min-h-screen relative transition-all duration-300 ${isSidebarOpen ? "md:ml-[280px]" : "md:ml-[80px]"}`}>

                {/* Top Header */}
                <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md px-8 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="text-slate-500 hover:text-slate-900 md:flex hidden bg-slate-50 rounded-lg"
                        >
                            <Menu size={20} />
                        </Button>
                        <nav className="hidden lg:flex items-center gap-3 text-sm font-medium">
                            <Home size={16} className="text-slate-400 hover:text-primary cursor-pointer transition-colors" onClick={() => navigate("/")} />
                            <span className="text-slate-300">/</span>
                            <span className="text-slate-900 capitalize font-bold">{location.pathname.split('/').pop() || 'Dashboard'}</span>
                        </nav>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)] animate-pulse" />
                            <span className="text-[11px] font-black text-emerald-600 tracking-wider uppercase">Live</span>
                        </div>

                        <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-slate-900 bg-slate-50 rounded-lg">
                            <Bell size={20} />
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full border-2 border-white" />
                        </Button>

                        <div className="h-10 w-[1px] bg-slate-100" />

                        <div className="flex items-center gap-4 pl-2 group cursor-pointer" onClick={() => navigate("/profile")}>
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-black text-slate-900 leading-none capitalize">{adminProfile?.full_name || 'Admin'}</p>
                            </div>
                            <Avatar className="w-11 h-11 border-2 border-slate-100 group-hover:border-primary transition-all shadow-sm">
                                <AvatarImage src={adminProfile?.avatar_url} />
                                <AvatarFallback className="bg-slate-100 text-slate-900 text-xs font-black">AD</AvatarFallback>
                            </Avatar>
                        </div>
                    </div>
                </header>

                {/* Main Viewport */}
                <main className="flex-1 p-10 relative z-10 overflow-y-auto scrollbar-hide">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: "circOut" }}
                        className="max-w-[1400px] mx-auto"
                    >
                        {children}
                    </motion.div>
                </main>
            </div>
        </div>
    );
};
