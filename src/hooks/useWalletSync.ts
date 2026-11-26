import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Ensures the authenticated user's in-app wallet is synced cleanly.
 * Wallet creation & the 1,000-coin Welcome Bonus happen server-side via DB trigger/RPC.
 */
export const useWalletSync = () => {
  const { userId } = useAuth();

  useEffect(() => {
    if (!userId) return;

    supabase
      .from('native_wallets')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ error }) => {
        if (error) {
          console.error('Wallet sync check error:', error);
        }
      });
  }, [userId]);
};
