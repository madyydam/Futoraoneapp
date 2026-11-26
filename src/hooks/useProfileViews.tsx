import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useTrackProfileView = (profileId: string | undefined, currentUserId: string | undefined) => {
  useEffect(() => {
    const trackView = async () => {
      if (!profileId || !currentUserId || profileId === currentUserId) return;

      // Record the profile view (notification is emitted server-side by trigger_notify_on_profile_view)
      const { error } = await supabase.from("profile_views").insert({
        profile_id: profileId,
        viewer_id: currentUserId,
      });

      if (error) {
        console.warn("Failed to record profile view:", error.message);
      }
    };

    trackView();
  }, [profileId, currentUserId]);
};
