import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Network } from "@capacitor/network";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuth } from "@/hooks/useAuth";
import { Wrench } from "lucide-react";

export const AppLifecycleManager = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useIsAdmin();
  const { refreshSession } = useAuth();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const lastResumeAtRef = useRef<number>(0);

  // Check global maintenance_mode flag
  useEffect(() => {
    let active = true;
    const loadConfig = async () => {
      try {
        const { data } = await supabase
          .from("app_config" as never)
          .select("key, value")
          .eq("key", "maintenance_mode")
          .maybeSingle();
        if (active && data) {
          setMaintenanceMode(Boolean((data as { value: unknown }).value));
        }
      } catch {
        // Ignore if offline or unauthenticated
      }
    };
    loadConfig();

    const channel = supabase
      .channel("app-config-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_config", filter: "key=eq.maintenance_mode" },
        (payload) => {
          const next = (payload.new as { value?: unknown } | undefined)?.value;
          if (typeof next === "boolean") {
            setMaintenanceMode(next);
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Browser visibility, network recovery, and Capacitor native lifecycle
  useEffect(() => {
    const handleResumeOrReconnect = async () => {
      const now = Date.now();
      if (now - lastResumeAtRef.current < 1500) return;
      lastResumeAtRef.current = now;

      try {
        supabase.auth.startAutoRefresh();
        await refreshSession();
      } catch {
        // Ignore transient offline errors
      }
      window.dispatchEvent(new CustomEvent("futora:reconnected"));
      queryClient.invalidateQueries({ refetchType: "active" });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleResumeOrReconnect();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    };

    const onOnline = () => {
      handleResumeOrReconnect();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", onOnline);

    let isMounted = true;
    const handles: Array<{ remove: () => Promise<void> }> = [];

    if (Capacitor.isNativePlatform()) {
      void CapApp.addListener("appStateChange", ({ isActive }) => {
        if (isActive) {
          handleResumeOrReconnect();
        } else {
          supabase.auth.stopAutoRefresh();
        }
      }).then((h) => {
        if (isMounted) handles.push(h);
        else void h.remove();
      });

      void CapApp.addListener("backButton", ({ canGoBack }) => {
        const rootRoutes = new Set(["/", "/feed", "/auth"]);
        if (!canGoBack || rootRoutes.has(window.location.pathname)) {
          CapApp.minimizeApp();
        } else {
          navigate(-1);
        }
      }).then((h) => {
        if (isMounted) handles.push(h);
        else void h.remove();
      });

      void Network.addListener("networkStatusChange", (status) => {
        if (status.connected) {
          handleResumeOrReconnect();
        }
      }).then((h) => {
        if (isMounted) handles.push(h);
        else void h.remove();
      });
    }

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("online", onOnline);
      handles.forEach((h) => void h.remove());
    };
  }, [navigate, queryClient, refreshSession]);

  const isBypassRoute =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/auth");

  if (maintenanceMode && !isAdmin && !isBypassRoute) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Wrench className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-black mb-2">Scheduled Maintenance</h1>
        <p className="text-muted-foreground max-w-md text-sm">
          One is currently undergoing maintenance to improve performance and security. We&apos;ll be back shortly.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
