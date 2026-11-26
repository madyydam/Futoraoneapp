import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { CartoonLoader } from "@/components/CartoonLoader";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { toast } from "sonner";

export const AdminRoute = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  const isLoading = authLoading || adminLoading;

  useEffect(() => {
    if (!isLoading && isAuthenticated && !isAdmin) {
      toast.error("Unauthorized Access: Admins Only 🛡️");
    }
  }, [isAdmin, isAuthenticated, isLoading]);

  if (isLoading) {
    return <CartoonLoader />;
  }

  return isAuthenticated && isAdmin ? <Outlet /> : <Navigate to="/admin/login" replace />;
};
