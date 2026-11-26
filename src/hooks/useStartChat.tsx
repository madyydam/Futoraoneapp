import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export const useStartChat = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userId: authUserId } = useAuth();

  const startChat = async (userId: string, currentUserId?: string) => {
    const me = currentUserId || authUserId;
    if (!me || me === userId) return;

    setLoading(true);
    try {
      const { data: conversationId, error } = await (supabase.rpc as any)(
        "get_or_create_conversation",
        { other_user_id: userId }
      );

      if (error) throw error;
      if (!conversationId) throw new Error("Failed to resolve conversation");

      navigate(`/chat/${conversationId}`);
    } catch (error) {
      console.error("Error starting chat:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start conversation.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return { startChat, loading };
};
