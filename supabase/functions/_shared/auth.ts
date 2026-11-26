import { createClient, SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost',
  'https://localhost',
  'capacitor://localhost',
  'https://futoraone.vercel.app',
  'https://futora1.vercel.app',
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const extra = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allowed = new Set([...DEFAULT_ALLOWED_ORIGINS, ...extra]);

  // Strict origin allowlist only — never accept arbitrary wildcard subdomains
  const allowOrigin = allowed.has(origin)
    ? origin
    : DEFAULT_ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

export function jsonResponse(
  req: Request,
  body: unknown,
  status = 200
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      'Content-Type': 'application/json',
    },
  });
}

export function getServiceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !serviceKey) {
    throw new Error('Supabase environment secrets are not configured');
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function requireAuth(
  req: Request
): Promise<{ user: User; supabase: SupabaseClient } | { errorResponse: Response }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { errorResponse: jsonResponse(req, { error: 'Missing authorization header' }, 401) };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return { errorResponse: jsonResponse(req, { error: 'Invalid authorization token' }, 401) };
  }

  const supabase = getServiceClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { errorResponse: jsonResponse(req, { error: 'Unauthorized' }, 401) };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_banned')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.is_banned) {
    return { errorResponse: jsonResponse(req, { error: 'Account is suspended' }, 403) };
  }

  return { user, supabase };
}

export async function requireAdmin(
  req: Request
): Promise<{ user: User; supabase: SupabaseClient } | { errorResponse: Response }> {
  const auth = await requireAuth(req);
  if ('errorResponse' in auth) return auth;

  const { data: roleRow, error } = await auth.supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', auth.user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (error || !roleRow) {
    return { errorResponse: jsonResponse(req, { error: 'Forbidden: Admin access required' }, 403) };
  }

  return auth;
}

export async function enforceRateLimit(
  supabase: SupabaseClient,
  key: string,
  limit: number,
  windowInterval: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_rate_limit', {
    limit_key: key,
    limit_count: limit,
    window_interval: windowInterval,
  });

  if (error) {
    console.error('Rate limit check failed:', error);
    return false;
  }

  return Boolean(data);
}
