import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Construction } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function GroupChatWindow({ groupId, currentUserId }: { groupId: string; currentUserId: string }) {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col h-[calc(100vh-0rem)] bg-background">
            {/* Header */}
            <div className="flex items-center p-4 border-b bg-card z-10 sticky top-0">
                <Button variant="ghost" size="icon" className="mr-2" onClick={() => navigate('/messages')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Users className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold">Group Chat</h3>
                        <p className="text-xs text-muted-foreground">Community Group</p>
                    </div>
                </div>
            </div>

            {/* Coming Soon Content */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center space-y-4 max-w-md">
                    <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                        <Construction className="w-10 h-10 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold">Group Chats Coming Soon!</h2>
                    <p className="text-muted-foreground">
                        We're working on bringing you an amazing group chat experience. 
                        Stay tuned for updates!
                    </p>
                    <Button onClick={() => navigate('/messages')} variant="outline">
                        Back to Messages
                    </Button>
                </div>
            </div>
        </div>
    );
}