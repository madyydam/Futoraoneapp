import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { enforceRateLimit, getCorsHeaders, jsonResponse, requireAuth } from "../_shared/auth.ts";

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

    const allowed = await enforceRateLimit(auth.supabase, `moderate_${auth.user.id}`, 60, '1 hour');
    if (!allowed) {
      return jsonResponse(req, { error: 'Rate limit exceeded' }, 429);
    }

    const { content } = await req.json();
    if (typeof content !== 'string' || content.trim().length === 0 || content.length > 10000) {
      return jsonResponse(req, { error: 'Content must be 1-10000 characters' }, 400);
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return jsonResponse(req, { error: 'Moderation service is not configured' }, 503);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({ input: content.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('OpenAI Moderation API error:', response.status);
        return jsonResponse(req, { error: 'Moderation provider failed' }, 502);
      }

      const results = data.results?.[0];
      return jsonResponse(req, {
        flagged: Boolean(results?.flagged),
        categories: results?.categories ?? {},
        category_scores: results?.category_scores ?? {},
      }, 200);
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error('Moderation Function Error:', error);
    return jsonResponse(req, { error: 'Internal server error' }, 500);
  }
});
