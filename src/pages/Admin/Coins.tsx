import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search, Coins, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { Badge } from "@/components/ui/badge";

interface UserBalance {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
    email: string;
    balance: number;
}

const AdminCoins = () => {
    const [users, setUsers] = useState<UserBalance[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch all profiles
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id, username, full_name, avatar_url, email');

            if (profileError) throw profileError;

            // Fetch all native wallets
            const { data: wallets, error: walletError } = await supabase
                .from('native_wallets')
                .select('user_id, balance');

            if (walletError) throw walletError;

            // Merge data
            const combinedData: UserBalance[] = (profiles || []).map(profile => {
                const wallet = (wallets || []).find(w => w.user_id === profile.id);
                // Default to 0 if no wallet found (though trigger should handle creation)
                return {
                    id: profile.id,
                    username: profile.username,
                    full_name: profile.full_name,
                    avatar_url: profile.avatar_url || '',
                    email: (profile as any).email || '',
                    balance: wallet ? wallet.balance : 0
                };
            });

            setUsers(combinedData);
        } catch (error) {
            console.error("Error fetching admin coins data:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                            User Coins <Coins className="text-yellow-500 w-8 h-8" />
                        </h1>
                        <p className="text-slate-500 font-medium">Manage and view all users' wallet balances.</p>
                    </div>

                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <Input
                            placeholder="Search by name, username or email..."
                            className="pl-10 h-12 bg-white border-slate-200 rounded-xl"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-0 shadow-xl overflow-hidden relative">
                        <div className="absolute -right-10 -top-10 opacity-20 rotate-12">
                            <Coins size={150} />
                        </div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-indigo-100 text-sm font-bold uppercase tracking-wider">Total Distributed</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-4xl font-black">{users.reduce((acc, curr) => acc + curr.balance, 0).toLocaleString()} 🪙</p>
                            <div className="flex items-center gap-1 mt-2 text-indigo-100 text-sm">
                                <ArrowUpRight size={16} /> <span>Across {users.length} Wallets</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-slate-200 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-slate-400 text-sm font-bold uppercase tracking-wider">Avg. Balance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-4xl font-black text-slate-900">
                                {users.length > 0 ? (users.reduce((acc, curr) => acc + curr.balance, 0) / users.length).toFixed(0) : 0} 🪙
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="font-bold">User</TableHead>
                                <TableHead className="font-bold">Email</TableHead>
                                <TableHead className="font-bold text-right">Balance</TableHead>
                                <TableHead className="font-bold text-center">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">Loading users...</TableCell>
                                </TableRow>
                            ) : filteredUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">No users found.</TableCell>
                                </TableRow>
                            ) : (
                                filteredUsers.map((user) => (
                                    <TableRow key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10 border border-slate-100">
                                                    <AvatarImage src={user.avatar_url} />
                                                    <AvatarFallback>{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-bold text-slate-900 leading-none">{user.full_name}</p>
                                                    <p className="text-xs text-slate-500 mt-1">@{user.username}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-slate-600 font-medium">{user.email}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="font-black text-slate-900 text-lg">{user.balance.toLocaleString()} 🪙</span>
                                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Verified Assets</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 font-black text-[10px] uppercase">Active</Badge>
                                        </TableCell>
                                    </TableRow>
                                )
                                ))}
                        </TableBody>
                    </Table>
                </Card>
            </div>
        </AdminLayout>
    );
};

export default AdminCoins;
