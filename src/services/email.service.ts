import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export type AuthEmailMode = 'auth_event' | 'welcome' | 'login';

const SESSION_KEY_PREFIX = 'one_auth_email_sent_';

export function clearAuthEmailSessionFlag(userId?: string | null): void {
  try {
    if (userId) {
      sessionStorage.removeItem(`${SESSION_KEY_PREFIX}${userId}`);
      return;
    }
    const keysToDelete: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(SESSION_KEY_PREFIX)) {
        keysToDelete.push(k);
      }
    }
    for (const k of keysToDelete) {
      sessionStorage.removeItem(k);
    }
  } catch {
    // Ignore storage access errors in private mode / non-browser contexts
  }
}

export async function triggerAuthEmail(
  userId: string | undefined,
  mode: AuthEmailMode = 'auth_event'
): Promise<void> {
  if (!userId) return;

  // Only invoke if edge email service is explicitly enabled, avoiding phantom CORS/404 errors
  const isEnabled = import.meta.env.VITE_ENABLE_EMAIL_SERVICE === 'true';
  if (!isEnabled) return;

  const sessionKey = `${SESSION_KEY_PREFIX}${userId}`;
  try {
    if (sessionStorage.getItem(sessionKey)) {
      return;
    }
    sessionStorage.setItem(sessionKey, mode);
  } catch {
    // Continue even if sessionStorage is unavailable; server enforces idempotency/cooldown
  }

  try {
    const { error } = await supabase.functions.invoke('send-email', {
      body: { action: mode },
    });
    if (error) {
      logger.warn('Email trigger skipped');
    }
  } catch {
    logger.warn('Email trigger unavailable');
  }
}

export async function sendAdminTestEmail(to?: string): Promise<{
  success: boolean;
  to: string;
  from: string;
  smtpHost: string;
  messageId: string | null;
}> {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: { action: 'test', to },
  });
  if (error) throw error;
  return data;
}

export async function triggerFiveDayEmailDigest(options?: {
  force?: boolean;
  dryRun?: boolean;
}): Promise<{
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
}> {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: { action: 'digest', ...options },
  });
  if (error) throw error;
  return data;
}
