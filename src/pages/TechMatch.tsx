import { useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Code, Cuboid as Cube } from "lucide-react";

import { FindDevsView } from "@/components/tech-match/FindDevsView";
import { AICompanionView } from "@/components/tech-match/AICompanionView";

const TechMatch = () => {
    const [activeTab, setActiveTab] = useState("find-devs");

    return (
        <div className="min-h-screen bg-background pb-20">
            <Tabs defaultValue="find-devs" className="w-full" onValueChange={setActiveTab}>
                {/* Floating Tabs Header */}
                <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b p-2 flex justify-center">
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="find-devs">
                            <Code className="w-4 h-4 mr-2" /> Find Devs
                        </TabsTrigger>
                        <TabsTrigger value="ai-companion" className="data-[state=active]:bg-pink-500 data-[state=active]:text-white">
                            <Cube className="w-4 h-4 mr-2" /> 3D Soulmate
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="find-devs">
                    <FindDevsView />
                </TabsContent>

                {/* AI Companion Tab */}
                <TabsContent value="ai-companion" className="mt-0">
                    <AICompanionView />
                </TabsContent>
            </Tabs>

            <BottomNav />
        </div>
    );
};

export default TechMatch;
