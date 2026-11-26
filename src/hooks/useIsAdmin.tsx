import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useIsAdmin = () => {
  const { userId, isLoading: authLoading } = useAuth();

  const { data: isAdmin = false, isLoading: roleLoading } = useQuery({
    queryKey: ["is_admin", userId],
    queryFn: async () => {
      if (!userId) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (error) {
        console.error("Error checking admin role:", error);
        return false;
      }
      return Boolean(data);
    },
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  return {
    isAdmin: Boolean(userId && isAdmin),
    loading: authLoading || (Boolean(userId) && roleLoading),
  };
};
