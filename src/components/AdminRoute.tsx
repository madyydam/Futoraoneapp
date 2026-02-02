import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CartoonLoader } from "@/components/CartoonLoader";
import { toast } from "sonner";

export const AdminRoute = () => {
    const { data: isAdmin, isLoading } = useQuery({
        queryKey: ["checkAdmin"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;

            // 0. Hardcoded Bypass (User Requested)
            if (user.email === 'madhurdhadve@gmail.com') return true;

            // 1. Fetch Profile
            const { data: profile } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();

            if (!profile) return false;

            // 2. Check explicitly designed Admin Usernames (Fail-safe)
            const SUPER_ADMINS = ['sanu', 'admin_futora', 'madhu_dev'];
            if (profile.username && SUPER_ADMINS.includes(profile.username.toLowerCase())) {
                return true;
            }

            // 3. Check Role Column (Future Proofing)
            // @ts-ignore - 'role' might not exist in types yet
            if (profile.role === 'admin') {
                return true;
            }

            // 4. Check Verification Category (Alternative)
            if (profile.verification_category === 'admin') {
                return true;
            }

            return false;
        },
        retry: false
    });

    useEffect(() => {
        if (!isLoading && !isAdmin) {
            toast.error("Unauthorized Access: Admins Only 🛡️");
        }
    }, [isAdmin, isLoading]);

    if (isLoading) {
        return <CartoonLoader />;
    }

    return isAdmin ? <Outlet /> : <Navigate to="/admin/login" replace />;
};
