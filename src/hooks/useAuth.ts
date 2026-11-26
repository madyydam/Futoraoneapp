import { useAuthContext } from "@/contexts/AuthContext";

export const useAuth = () => {
  const { user, session, isLoading, isAuthenticated, userId, signOut, refreshSession } = useAuthContext();

  return {
    user,
    session,
    isLoading,
    isError: false,
    isAuthenticated,
    userId,
    signOut,
    refreshSession,
    refetch: refreshSession,
  };
};
