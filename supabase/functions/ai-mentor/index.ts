import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, mode = 'mentor' } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) {
      return new Response(JSON.stringify({ generatedText: "Error: GEMINI_API_KEY missing in Supabase Secrets." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Define system instructions based on mode
    const systemInstructions: Record<string, string> = {
      mentor: "You are an expert Tech Mentor at FutoraOne. Your goal is to help users with code, technical architecture, and career advice in tech. Be professional, encouraging, and highly technical.",
      enhance: "You are a code optimization expert. Analyze the provided code and suggest improvements for performance, readability, and security. Provide clear explanations for your changes.",
      ideas: "You are a creative technical brainstormer. Help users find unique and impactful project ideas based on their skill levels and interests.",
      female_companion: "You are a friendly, caring, and supportive female AI companion. Engage in warm, friendly conversation, show interest in the user's day, and offer emotional support if needed.",
      male_companion: "You are a friendly, supportive, and grounded male AI companion. Engage in good conversation, show interest in the user's life, and offer steady support and encouragement.",
      roadmap: "You are a learning path specialist. Create structured, step-by-step learning roadmaps for various tech stacks and skills, recommending resources and projects for each stage."
    };

    const instruction = systemInstructions[mode] || systemInstructions.mentor;

    // Format history for Gemini API
    const contents = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    // Add system instruction as the first turn or as a model parameter if using system_instruction (v1beta)
    const body = {
      system_instruction: {
        parts: [{ text: instruction }]
      },
      contents: contents,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({
        generatedText: `API Error (${response.status}): ${data.error?.message || "Unknown API failure"}`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Model returned empty response. Structure: " + JSON.stringify(data).substring(0, 100);

    return new Response(JSON.stringify({ generatedText: text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({
      generatedText: `Edge Function Crash: ${error.message}`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
