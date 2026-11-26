import React from "react";
import { ShieldAlert, LogOut, Mail, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface BannedScreenProps {
  email?: string | null;
  onSignOut?: () => void;
}

export const BannedScreen: React.FC<BannedScreenProps> = ({ email, onSignOut }) => {
  const handleSignOut = async () => {
    if (onSignOut) {
      onSignOut();
    } else {
      await supabase.auth.signOut();
      window.location.href = "/auth";
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950 p-4 select-none">
      <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-slate-900/90 p-8 text-center shadow-2xl backdrop-blur-2xl">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 animate-pulse">
          <ShieldAlert className="h-10 w-10" />
        </div>

        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-red-400 border border-red-500/20">
          <AlertTriangle className="h-3.5 w-3.5" />
          Access Revoked
        </div>

        <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
          Account Suspended
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Your account has been permanently banned by platform administrators for violating our Terms of Service and Community Guidelines.
        </p>

        {email && (
          <div className="mt-4 rounded-xl bg-slate-800/60 border border-slate-700/50 py-2 px-3 text-xs font-mono text-slate-300">
            {email}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <Button
            variant="outline"
            onClick={() => window.open("mailto:support@heyocco.com?subject=Account%20Suspension%20Appeal", "_blank")}
            className="w-full border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200"
          >
            <Mail className="mr-2 h-4 w-4" />
            Contact Support
          </Button>

          <Button
            variant="destructive"
            onClick={handleSignOut}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log Out
          </Button>
        </div>

        <p className="mt-6 text-[11px] text-slate-500">
          If you believe this suspension is an error, please contact our appeal team.
        </p>
      </div>
    </div>
  );
};
