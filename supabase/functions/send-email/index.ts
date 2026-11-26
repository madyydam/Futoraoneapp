import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  enforceRateLimit,
  getCorsHeaders,
  getServiceClient,
  jsonResponse,
  requireAdmin,
  requireAuth,
} from '../_shared/auth.ts';
import { runFiveDayDigest } from '../_shared/digest-logic.ts';
import { buildLoginEmail, buildTestEmail, buildWelcomeEmail } from '../_shared/email-templates.ts';
import { getCloudflareSmtpConfig, sendCloudflareSmtpEmail } from '../_shared/smtp.ts';
import { isValidEmailAddress } from '../_shared/smtp-protocol.ts';

type EmailAction = 'auth_event' | 'welcome' | 'login' | 'digest' | 'test';

interface EmailRequestBody {
  action?: EmailAction;
  to?: string;
  force?: boolean;
  dryRun?: boolean;
  userIds?: string[];
  limit?: number;
}

const LOGIN_EMAIL_COOLDOWN_MINUTES = 60;
const WELCOME_GRACE_MINUTES = 2;
const NEW_USER_AUTH_EVENT_WINDOW_MINUTES = 10;

async function constantTimeEquals(a: string, b: string): Promise<boolean> {
  if (!a || !b) return false;
  const encoder = new TextEncoder();
  const [hashA, hashB] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b)),
  ]);
  const bytesA = new Uint8Array(hashA);
  const bytesB = new Uint8Array(hashB);
  let diff = 0;
  for (let i = 0; i < bytesA.length; i++) {
    diff |= bytesA[i] ^ bytesB[i];
  }
  return diff === 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  if (req.method !== 'POST') {
    return jsonResponse(req, { error: 'Method not allowed' }, 405);
  }

  try {
    const body = (await req.json().catch(() => ({}))) as EmailRequestBody;
    const action: EmailAction = body.action ?? 'auth_event';
    const appUrl = (Deno.env.get('APP_URL') ?? 'https://www.one.heyocco.com').trim();

    if (action === 'digest') {
      const cronSecret = (Deno.env.get('CRON_SECRET') ?? '').trim();
      const providedSecret = (req.headers.get('x-cron-secret') ?? '').trim();
      const isCronAuthorized = Boolean(
        cronSecret && providedSecret && (await constantTimeEquals(cronSecret, providedSecret))
      );

      let supabase = isCronAuthorized ? getServiceClient() : null;
      if (!isCronAuthorized) {
        const adminAuth = await requireAdmin(req);
        if ('errorResponse' in adminAuth) return adminAuth.errorResponse;
        supabase = adminAuth.supabase;
      }

      const summary = await runFiveDayDigest({
        supabase: supabase!,
        sendEmail: (msg) => sendCloudflareSmtpEmail(msg),
        appUrl,
        force: Boolean(body.force),
        dryRun: Boolean(body.dryRun),
        userIds: Array.isArray(body.userIds) ? body.userIds : undefined,
        limit: typeof body.limit === 'number' ? body.limit : undefined,
      });

      return jsonResponse(req, { success: true, ...summary }, 200);
    }

    if (action === 'test') {
      const adminAuth = await requireAdmin(req);
      if ('errorResponse' in adminAuth) return adminAuth.errorResponse;

      const targetEmail = (body.to ?? adminAuth.user.email ?? '').trim();
      if (!isValidEmailAddress(targetEmail)) {
        return jsonResponse(req, { error: 'Invalid recipient email address' }, 400);
      }

      const smtpConfig = getCloudflareSmtpConfig();
      const template = buildTestEmail({ recipientEmail: targetEmail, appUrl });
      const smtpRes = await sendCloudflareSmtpEmail({
        to: { email: targetEmail },
        subject: template.subject,
        text: template.text,
        html: template.html,
        config: smtpConfig,
      });

      await adminAuth.supabase.from('email_logs').insert({
        user_id: adminAuth.user.id,
        recipient_email: targetEmail,
        email_type: 'test',
        subject: template.subject,
        status: 'sent',
        message_id: smtpRes.messageId,
      });

      return jsonResponse(req, {
        success: true,
        sent: true,
        to: targetEmail,
        from: smtpConfig.from.email,
        smtpHost: `${smtpConfig.host}:${smtpConfig.port}`,
        messageId: smtpRes.messageId,
      }, 200);
    }

    if (action !== 'auth_event' && action !== 'welcome' && action !== 'login') {
      return jsonResponse(req, { error: 'Unsupported email action' }, 400);
    }

    const auth = await requireAuth(req);
    if ('errorResponse' in auth) return auth.errorResponse;

    const { data: profile } = await auth.supabase
      .from('profiles')
      .select('id, email, full_name, username, settings, created_at')
      .eq('id', auth.user.id)
      .maybeSingle();

    const recipientEmail = (profile?.email ?? auth.user.email ?? '').trim();
    if (!isValidEmailAddress(recipientEmail)) {
      return jsonResponse(req, { sent: false, skipped: true, reason: 'missing_email' }, 200);
    }

    const emailEnabled = (profile?.settings as { notifications?: { email?: boolean } } | null)?.notifications?.email;
    if (emailEnabled === false) {
      return jsonResponse(req, { sent: false, skipped: true, reason: 'email_notifications_disabled' }, 200);
    }

    const { data: existingWelcome } = await auth.supabase
      .from('email_logs')
      .select('id, status, created_at')
      .eq('user_id', auth.user.id)
      .eq('email_type', 'welcome')
      .in('status', ['pending', 'sent'])
      .maybeSingle();

    const createdAtIso = profile?.created_at ?? auth.user.created_at;
    const accountAgeMs = createdAtIso ? Date.now() - Date.parse(createdAtIso) : Number.POSITIVE_INFINITY;
    const isRecentlyCreatedAccount =
      Number.isFinite(accountAgeMs) && accountAgeMs <= NEW_USER_AUTH_EVENT_WINDOW_MINUTES * 60 * 1000;

    const resolvedType: 'welcome' | 'login' =
      action === 'welcome' || (action === 'auth_event' && !existingWelcome && isRecentlyCreatedAccount)
        ? 'welcome'
        : 'login';

    if (resolvedType === 'welcome') {
      if (existingWelcome) {
        return jsonResponse(req, { sent: false, skipped: true, reason: 'welcome_already_sent' }, 200);
      }

      const template = buildWelcomeEmail({
        name: profile?.full_name || auth.user.user_metadata?.full_name,
        username: profile?.username || auth.user.user_metadata?.username,
        appUrl,
      });

      const { data: insertedLog, error: lockErr } = await auth.supabase
        .from('email_logs')
        .insert({
          user_id: auth.user.id,
          recipient_email: recipientEmail,
          email_type: 'welcome',
          subject: template.subject,
          status: 'pending',
        })
        .select('id')
        .single();

      if (lockErr) {
        if (lockErr.code === '23505') {
          return jsonResponse(req, { sent: false, skipped: true, reason: 'welcome_already_sent' }, 200);
        }
        throw lockErr;
      }

      try {
        const smtpRes = await sendCloudflareSmtpEmail({
          to: { email: recipientEmail, name: profile?.full_name || profile?.username || undefined },
          subject: template.subject,
          text: template.text,
          html: template.html,
        });

        await auth.supabase
          .from('email_logs')
          .update({ status: 'sent', message_id: smtpRes.messageId })
          .eq('id', insertedLog.id);

        return jsonResponse(req, {
          success: true,
          sent: true,
          emailType: 'welcome',
          messageId: smtpRes.messageId,
        }, 200);
      } catch (smtpError) {
        const msg = smtpError instanceof Error ? smtpError.message : String(smtpError);
        await auth.supabase
          .from('email_logs')
          .update({ status: 'failed', error_message: msg })
          .eq('id', insertedLog.id);
        throw smtpError;
      }
    }

    // Login email for existing/returning users (with cooldown & signup-grace checks)
    if (existingWelcome?.created_at) {
      const welcomeAgeMs = Date.now() - Date.parse(existingWelcome.created_at);
      if (Number.isFinite(welcomeAgeMs) && welcomeAgeMs < WELCOME_GRACE_MINUTES * 60 * 1000) {
        return jsonResponse(req, { sent: false, skipped: true, reason: 'recent_welcome_grace' }, 200);
      }
    }

    const cooldownSince = new Date(Date.now() - LOGIN_EMAIL_COOLDOWN_MINUTES * 60 * 1000).toISOString();
    const { data: recentLogin } = await auth.supabase
      .from('email_logs')
      .select('id')
      .eq('user_id', auth.user.id)
      .eq('email_type', 'login')
      .in('status', ['pending', 'sent'])
      .gte('created_at', cooldownSince)
      .limit(1)
      .maybeSingle();

    if (recentLogin) {
      return jsonResponse(req, { sent: false, skipped: true, reason: 'login_cooldown' }, 200);
    }

    const allowed = await enforceRateLimit(auth.supabase, `email_login_${auth.user.id}`, 10, '1 day');
    if (!allowed) {
      return jsonResponse(req, { sent: false, skipped: true, reason: 'daily_rate_limit' }, 200);
    }

    const template = buildLoginEmail({
      name: profile?.full_name || profile?.username,
      appUrl,
    });

    const { data: loginLog } = await auth.supabase
      .from('email_logs')
      .insert({
        user_id: auth.user.id,
        recipient_email: recipientEmail,
        email_type: 'login',
        subject: template.subject,
        status: 'pending',
      })
      .select('id')
      .single();

    try {
      const smtpRes = await sendCloudflareSmtpEmail({
        to: { email: recipientEmail, name: profile?.full_name || profile?.username || undefined },
        subject: template.subject,
        text: template.text,
        html: template.html,
      });

      if (loginLog?.id) {
        await auth.supabase
          .from('email_logs')
          .update({ status: 'sent', message_id: smtpRes.messageId })
          .eq('id', loginLog.id);
      }

      return jsonResponse(req, {
        success: true,
        sent: true,
        emailType: 'login',
        messageId: smtpRes.messageId,
      }, 200);
    } catch (smtpError) {
      const msg = smtpError instanceof Error ? smtpError.message : String(smtpError);
      if (loginLog?.id) {
        await auth.supabase
          .from('email_logs')
          .update({ status: 'failed', error_message: msg })
          .eq('id', loginLog.id);
      }
      throw smtpError;
    }
  } catch (error) {
    console.error('send-email error:', error);
    return jsonResponse(req, {
      error: error instanceof Error ? error.message : 'Internal server error',
    }, 500);
  }
});
