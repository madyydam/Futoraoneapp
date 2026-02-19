import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAuth = () => {
    const { data: user, isLoading, isError, refetch } = useQuery({
        queryKey: ["auth_user"],
        queryFn: async () => {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) throw error;
            return user;
        },
        staleTime: 1000 * 60 * 60, // 1 hour - user rarely changes during session
        gcTime: 1000 * 60 * 60 * 2, // 2 hours
        retry: 1,
    });

    return {
        user,
        isLoading,
        isError,
        isAuthenticated: !!user,
        userId: user?.id,
        refetch
    };
};
