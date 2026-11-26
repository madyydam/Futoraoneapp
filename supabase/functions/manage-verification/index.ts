import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';
import { getCorsHeaders, jsonResponse, requireAdmin } from '../_shared/auth.ts';

interface VerificationAction {
  requestId: string;
  action: 'approve' | 'reject';
  reviewerNotes?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  if (req.method !== 'POST') {
    return jsonResponse(req, { error: 'Method not allowed' }, 405);
  }

  try {
    const auth = await requireAdmin(req);
    if ('errorResponse' in auth) return auth.errorResponse;

    const { requestId, action, reviewerNotes }: VerificationAction = await req.json();
    if (!requestId || (action !== 'approve' && action !== 'reject')) {
      return jsonResponse(req, { error: 'Invalid requestId or action' }, 400);
    }

    // Use caller-scoped client so review_verification_request sees auth.uid()
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    const { data, error } = await userClient.rpc('review_verification_request', {
      p_request_id: requestId,
      p_action: action,
      p_reviewer_notes: reviewerNotes ?? null,
    });

    if (error) {
      const status = error.message.includes('not found') ? 404 : error.message.includes('already') ? 409 : 400;
      return jsonResponse(req, { error: error.message }, status);
    }

    return jsonResponse(req, {
      success: true,
      message: `Verification request ${action}ed successfully`,
      data,
    }, 200);
  } catch (error) {
    console.error('Error in manage-verification:', error);
    return jsonResponse(req, { error: 'Internal server error' }, 500);
  }
});
