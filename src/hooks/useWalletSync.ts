import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Ensures the authenticated user's in-app wallet exists (100% in-app, no third-party sync).
 * Calls ensure_my_wallet() RPC which creates the wallet + 1,000-coin Welcome Bonus if missing.
 */
export const useWalletSync = () => {
  const { userId } = useAuth();

  useEffect(() => {
    if (!userId) return;

    // Self-heal: ensure wallet row exists for this user (idempotent, server-side)
    (supabase.rpc as unknown as (fn: string) => Promise<{ error: unknown }>)('ensure_my_wallet')
      .then(({ error }) => {
        if (error) {
          console.error('Wallet sync error:', error);
        }
      });
  }, [userId]);
};
