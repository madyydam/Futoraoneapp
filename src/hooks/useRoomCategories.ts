import { useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface RoomCategory {
    id: string;
    conversation_id: string;
    name: string;
    icon: string;
    color: string;
    position: number;
}

export const useRoomCategories = (conversationId: string | undefined) => {
    const queryClient = useQueryClient();
    const queryKey = ["room_categories", conversationId];

    const { data: categories = [], isLoading: loading } = useQuery({
        queryKey,
        queryFn: async () => {
            if (!conversationId) return [];
            const { data, error } = await (supabase as any)
                .from("room_categories")
                .select("*")
                .eq("conversation_id", conversationId)
                .order("position", { ascending: true });

            if (error) throw error;
            return data as RoomCategory[];
        },
        enabled: !!conversationId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    useEffect(() => {
        if (!conversationId) return;

        const channel = supabase
            .channel(`room_categories_${conversationId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "room_categories",
                    filter: `conversation_id=eq.${conversationId}`,
                },
                (payload) => {
                    queryClient.setQueryData(queryKey, (prev: RoomCategory[] | undefined) => {
                        const current = prev || [];
                        if (payload.eventType === 'INSERT') {
                            const newCat = payload.new as RoomCategory;
                            if (current.some(c => c.id === newCat.id)) return current;
                            return [...current, newCat].sort((a, b) => a.position - b.position);
                        } else if (payload.eventType === 'UPDATE') {
                            const updatedCat = payload.new as RoomCategory;
                            return current.map(c => c.id === updatedCat.id ? updatedCat : c).sort((a, b) => a.position - b.position);
                        } else if (payload.eventType === 'DELETE') {
                            const deletedId = payload.old.id;
                            return current.filter(c => c.id !== deletedId);
                        }
                        return current;
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [conversationId, queryClient, queryKey]);

    const addCategory = async (name: string, icon: string = 'Sparkles', color: string = 'purple') => {
        if (!conversationId) return;
        const position = categories.length;
        const tempId = crypto.randomUUID();

        // Optimistic update
        const newCategory = { id: tempId, conversation_id: conversationId, name, icon, color, position };
        queryClient.setQueryData(queryKey, (prev: RoomCategory[] | undefined) => [...(prev || []), newCategory]);

        const { error } = await (supabase as any)
            .from("room_categories")
            .insert({ conversation_id: conversationId, name, icon, color, position });

        if (error) {
            queryClient.invalidateQueries({ queryKey });
        }
        return error;
    };

    const updateCategory = async (id: string, updates: Partial<RoomCategory>) => {
        queryClient.setQueryData(queryKey, (prev: RoomCategory[] | undefined) =>
            (prev || []).map(c => c.id === id ? { ...c, ...updates } : c)
        );

        const { error } = await (supabase as any)
            .from("room_categories")
            .update(updates)
            .eq("id", id);

        if (error) {
            queryClient.invalidateQueries({ queryKey });
        }
        return error;
    };

    const deleteCategory = async (id: string) => {
        queryClient.setQueryData(queryKey, (prev: RoomCategory[] | undefined) =>
            (prev || []).filter(c => c.id !== id)
        );

        const { error } = await (supabase as any)
            .from("room_categories")
            .delete()
            .eq("id", id);

        if (error) {
            queryClient.invalidateQueries({ queryKey });
        }
        return error;
    };

    return {
        categories,
        loading,
        addCategory,
        updateCategory,
        deleteCategory,
        refetch: () => queryClient.invalidateQueries({ queryKey })
    };
};
