import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const getEnv = (key: string) => {
  const val = import.meta.env[key];
  return typeof val === 'string' ? val.trim() : '';
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
const SUPABASE_PUBLISHABLE_KEY = getEnv('VITE_SUPABASE_PUBLISHABLE_KEY');

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('Supabase configuration is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
}

export const supabase = createClient<Database>(
  SUPABASE_URL || 'https://sbzsgeokspmkewrmuqgi.supabase.co',
  SUPABASE_PUBLISHABLE_KEY || '',
  {
    auth: {
      storage: window.localStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
