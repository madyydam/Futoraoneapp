import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Inbox, Send, Briefcase, Zap, Construction } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";

const ApplicationsDashboard = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
                <div className="container max-w-2xl mx-auto p-4 flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold">Applications Dashboard</h1>
                        <p className="text-sm text-muted-foreground">Manage your requests and listings</p>
                    </div>
                </div>
            </div>

            <div className="container max-w-2xl mx-auto p-4">
                <Tabs defaultValue="received" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="received" className="gap-2">
                            <Inbox className="w-4 h-4" />
                            Received
                        </TabsTrigger>
                        <TabsTrigger value="sent" className="gap-2">
                            <Send className="w-4 h-4" />
                            Sent
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="received" className="space-y-4">
                        <Card className="bg-muted/30">
                            <CardContent className="py-12 text-center">
                                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                    <Construction className="w-8 h-8 text-primary" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
                                <p className="text-muted-foreground max-w-sm mx-auto">
                                    Founder and Gig listing applications will appear here once the marketplace is live.
                                </p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="sent" className="space-y-4">
                        <Card className="bg-muted/30">
                            <CardContent className="py-12 text-center">
                                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                    <Construction className="w-8 h-8 text-primary" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
                                <p className="text-muted-foreground max-w-sm mx-auto">
                                    Your sent applications will appear here once the marketplace is live.
                                </p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            <BottomNav />
        </div>
    );
};

export default ApplicationsDashboard;