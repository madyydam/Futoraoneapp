import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { enforceRateLimit, getCorsHeaders, jsonResponse, requireAuth } from "../_shared/auth.ts";

const SYSTEM_INSTRUCTIONS: Record<string, string> = {
  mentor: "You are an expert Tech Mentor at FutoraOne. Your goal is to help users with code, technical architecture, and career advice in tech. Be professional, encouraging, and highly technical.",
  enhance: "You are a social media and technical writing optimizer. Return valid JSON with keys: enhanced_content (string), hashtags (string[] without #), suggestions (string).",
  ideas: "You are a creative technical brainstormer. Help users find unique and impactful project ideas based on their skill levels and interests.",
  female_companion: "You are a friendly, caring, and supportive female AI companion. Engage in warm, friendly conversation, show interest in the user's day, and offer emotional support if needed.",
  male_companion: "You are a friendly, supportive, and grounded male AI companion. Engage in good conversation, show interest in the user's life, and offer steady support and encouragement.",
  roadmap: "You are a learning path specialist. Create structured, step-by-step learning roadmaps for various tech stacks and skills, recommending resources and projects for each stage."
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
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

    const allowed = await enforceRateLimit(auth.supabase, `ai_mentor_${auth.user.id}`, 30, '1 hour');
    if (!allowed) {
      return jsonResponse(req, { error: 'Rate limit exceeded. Please try again later.' }, 429);
    }

    const bodyJson = await req.json();
    const messages = bodyJson?.messages as ChatMessage[] | undefined;
    const mode = typeof bodyJson?.mode === 'string' ? bodyJson.mode : 'mentor';

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 25) {
      return jsonResponse(req, { error: 'messages must be a non-empty array (max 25 turns)' }, 400);
    }

    for (const m of messages) {
      if (!m || typeof m.content !== 'string' || m.content.trim().length === 0 || m.content.length > 4000) {
        return jsonResponse(req, { error: 'Each message must be 1-4000 characters' }, 400);
      }
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return jsonResponse(req, { error: 'AI service is not configured' }, 503);
    }

    const instruction = SYSTEM_INSTRUCTIONS[mode] || SYSTEM_INSTRUCTIONS.mentor;
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content.trim() }],
    }));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            system_instruction: { parts: [{ text: instruction }] },
            contents,
            generationConfig: {
              temperature: 0.7,
              topP: 0.95,
              maxOutputTokens: 1024,
            },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('Gemini API error:', response.status, data?.error?.message);
        return jsonResponse(req, { error: 'AI provider request failed' }, 502);
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        return jsonResponse(req, { error: 'AI provider returned an empty response' }, 502);
      }

      return jsonResponse(req, { generatedText: text }, 200);
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error('ai-mentor error:', error);
    return jsonResponse(req, { error: 'Internal server error' }, 500);
  }
});
