import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    DollarSign,
    CreditCard,
    Download,
    CheckCircle,
    Construction
} from "lucide-react";

const FinancePage = () => {
    return (
        <AdminLayout>
            <div className="space-y-10 pb-20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-2">Finance</h2>
                        <p className="text-slate-500 font-medium italic">Monitor revenue and payouts.</p>
                    </div>
                    <Button variant="outline" className="gap-3 h-12 px-8 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold shadow-sm">
                        <Download className="w-5 h-5" />
                        Export Reports
                    </Button>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    <Card className="shadow-lg shadow-slate-200/50 border-slate-200 rounded-3xl overflow-hidden bg-white">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50">
                            <CardTitle className="text-sm font-black text-slate-500 uppercase tracking-wider">Total Revenue</CardTitle>
                            <DollarSign className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="text-4xl font-black text-slate-900 mb-1">$0.00</div>
                            <p className="text-xs font-bold text-slate-400">Total earnings</p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-lg shadow-slate-200/50 border-slate-200 rounded-3xl overflow-hidden bg-white">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50">
                            <CardTitle className="text-sm font-black text-slate-500 uppercase tracking-wider">Pending Payouts</CardTitle>
                            <CreditCard className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="text-4xl font-black text-slate-900 mb-1">$0.00</div>
                            <p className="text-xs font-bold text-slate-400">Scheduled for payment</p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-lg shadow-slate-200/50 border-slate-200 rounded-3xl overflow-hidden bg-white">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50">
                            <CardTitle className="text-sm font-black text-slate-500 uppercase tracking-wider">Active Subs</CardTitle>
                            <CheckCircle className="h-4 w-4 text-purple-500" />
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="text-4xl font-black text-slate-900 mb-1">0</div>
                            <p className="text-xs font-bold text-slate-400">Active subscriptions</p>
                        </CardContent>
                    </Card>
                </div>

                <Card className="shadow-xl shadow-slate-200/40 border-slate-200 rounded-3xl overflow-hidden bg-white">
                    <CardContent className="p-16 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                            <Construction className="w-10 h-10 text-slate-400" />
                        </div>
                        <div className="space-y-2 max-w-lg">
                            <h3 className="text-2xl font-black text-slate-900">Coming Soon</h3>
                            <p className="text-slate-500 font-medium">
                                The finance system is currently being set up.
                                Full financial tools will be available soon.
                            </p>
                        </div>
                        <Button disabled className="h-12 px-8 rounded-xl font-bold bg-slate-100 text-slate-400">
                            Notify on Launch
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
};

export default FinancePage;
