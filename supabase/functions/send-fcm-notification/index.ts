import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { create } from 'https://deno.land/x/djwt@v2.8/mod.ts';
import { enforceRateLimit, getCorsHeaders, jsonResponse, requireAuth } from '../_shared/auth.ts';

interface NotificationRequest {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  isBroadcast?: boolean;
}

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

function str2ab(str: string) {
  const binaryString = atob(str);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getAccessToken(serviceAccount: ServiceAccount): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
  };

  const pem = serviceAccount.private_key.replace(/\\n/g, '\n');
  const binaryKey = str2ab(pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n|\r/g, ''));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const jwt = await create(header, payload, key);
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error('Failed to mint FCM OAuth access token');
  }
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  if (req.method !== 'POST') {
    return jsonResponse(req, { error: 'Method not allowed' }, 405);
  }

  try {
    const auth = await requireAuth(req);
    if ('errorResponse' in auth) return auth.errorResponse;

    const payload: NotificationRequest = await req.json();
    const { userIds = [], title, body, data = {}, isBroadcast = false } = payload;
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (typeof title !== 'string' || title.trim().length === 0 || title.length > 120) {
      return jsonResponse(req, { error: 'Invalid title' }, 400);
    }
    if (typeof body !== 'string' || body.trim().length === 0 || body.length > 500) {
      return jsonResponse(req, { error: 'Invalid body' }, 400);
    }

    // Check admin status for broadcasts or multi-user pushes
    const { data: adminRole } = await auth.supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', auth.user.id)
      .eq('role', 'admin')
      .maybeSingle();
    const isAdmin = Boolean(adminRole);

    if ((isBroadcast || !Array.isArray(userIds) || userIds.length === 0 || userIds.length > 5) && !isAdmin) {
      return jsonResponse(req, { error: 'Forbidden: Bulk notifications require admin role' }, 403);
    }

    let candidateUserIds = Array.isArray(userIds) ? userIds.filter((id) => typeof id === 'string' && uuidRe.test(id)) : [];
    if (isAdmin && isBroadcast && candidateUserIds.length === 0) {
      const { data: allTokens } = await auth.supabase.from('user_push_tokens').select('user_id').limit(1000);
      candidateUserIds = (allTokens ?? []).map((row: { user_id: string }) => row.user_id);
    }

    if (candidateUserIds.length === 0) {
      return jsonResponse(req, { results: [], sent: 0 }, 200);
    }

    const allowed = await enforceRateLimit(
      auth.supabase,
      `fcm_${auth.user.id}`,
      isAdmin ? 500 : 60,
      '1 hour'
    );
    if (!allowed) {
      return jsonResponse(req, { error: 'Notification rate limit exceeded' }, 429);
    }

    // Exclude users who have blocked the sender (unless admin)
    let targetIds = [...new Set(candidateUserIds)];
    if (!isAdmin) {
      const { data: blocks } = await auth.supabase
        .from('blocks')
        .select('blocker_id')
        .in('blocker_id', targetIds)
        .eq('blocked_id', auth.user.id);
      const blockedSet = new Set((blocks ?? []).map((b: { blocker_id: string }) => b.blocker_id));
      targetIds = targetIds.filter((id) => !blockedSet.has(id));
    }

    if (targetIds.length === 0) {
      return jsonResponse(req, { results: [], sent: 0 }, 200);
    }

    const FCM_SERVICE_ACCOUNT_JSON = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');
    if (!FCM_SERVICE_ACCOUNT_JSON) {
      return jsonResponse(req, { error: 'FCM service is not configured' }, 503);
    }

    // Resolve tokens server-side (never accept raw tokens from client)
    const [{ data: pushRows }, { data: profileRows }] = await Promise.all([
      auth.supabase.from('user_push_tokens').select('user_id, fcm_token').in('user_id', targetIds),
      auth.supabase.from('profiles').select('id, digest_mode, fcm_token').in('id', targetIds),
    ]);

    const digestDisabled = new Set(
      (profileRows ?? [])
        .filter((p: { digest_mode: boolean | null }) => p.digest_mode)
        .map((p: { id: string }) => p.id)
    );

    const tokenMap = new Map<string, string>();
    for (const p of (profileRows ?? []) as { id: string; fcm_token: string | null }[]) {
      if (p.fcm_token && !digestDisabled.has(p.id)) tokenMap.set(p.id, p.fcm_token);
    }
    for (const row of (pushRows ?? []) as { user_id: string; fcm_token: string | null }[]) {
      if (row.fcm_token && !digestDisabled.has(row.user_id)) tokenMap.set(row.user_id, row.fcm_token);
    }

    const tokens = [...tokenMap.values()];
    if (tokens.length === 0) {
      return jsonResponse(req, { results: [], sent: 0 }, 200);
    }

    const serviceAccount: ServiceAccount = JSON.parse(FCM_SERVICE_ACCOUNT_JSON);
    const accessToken = await getAccessToken(serviceAccount);
    const endpoint = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;

    const safeData: Record<string, string> = {};
    for (const [k, v] of Object.entries(data)) {
      safeData[k] = String(v);
    }

    const results = await Promise.all(
      tokens.map(async (token) => {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: {
                token,
                notification: { title: title.trim(), body: body.trim() },
                data: safeData,
                webpush: {
                  notification: {
                    icon: '/app-icon.png',
                    badge: '/favicon.png',
                    click_action: '/',
                  },
                },
              },
            }),
          });
          return { status: response.status, ok: response.ok };
        } catch (err) {
          return { ok: false, error: (err as Error).message };
        }
      })
    );

    return jsonResponse(req, { sent: results.filter((r) => r.ok).length, results }, 200);
  } catch (error) {
    console.error('FCM Error:', error);
    return jsonResponse(req, { error: 'Internal server error' }, 500);
  }
});
