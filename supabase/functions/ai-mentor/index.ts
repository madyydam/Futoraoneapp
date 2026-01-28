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
    const { messages, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is missing");
      return new Response(JSON.stringify({ error: "Server configuration error: LOVABLE_API_KEY is missing." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompts: Record<string, string> = {
      mentor: `You are an expert tech mentor on FutoraOne - a social platform for tech enthusiasts. Help users with debugging, learning, project ideas, and career advice. Be concise, friendly, and encouraging. Use emojis sparingly to add personality.`,
      enhance: `You are an AI content enhancer for a tech social platform. Improve post descriptions to be more engaging and professional while keeping the tech focus. Also suggest relevant hashtags. Return JSON: { "enhanced_content": "...", "hashtags": [...] }`,
      ideas: `You are a creative project idea generator for developers. Generate unique, practical project ideas based on user interests. Return JSON: { "title": "...", "description": "...", "tech_stack": [...], "difficulty": "beginner|intermediate|advanced", "features": [...] }`,
      video_gen: `You are an AI video script generator for tech content. Create short, engaging scripts for tech reels/shorts. Return JSON: { "script": "...", "scenes": [...], "duration": "30s|60s" }`,
      female_companion: `You are Riya, a friendly and supportive AI companion on FutoraOne. You're knowledgeable about tech, coding, and startups. Be warm, encouraging, and helpful. Keep responses conversational and engaging. Use occasional emojis. Never be inappropriate.`,
      male_companion: `You are Arjun, a cool and motivating AI companion on FutoraOne. You're passionate about building tech products and helping developers grow. Be encouraging, give practical advice, and maintain a friendly tone. Use occasional emojis. Never be inappropriate.`,
      cofounder: `You are Arya, an AI co-founder advisor on FutoraOne. Help users validate startup ideas, suggest equity splits, find co-founders, and provide business advice. Be professional but friendly. Focus on actionable insights.`,
      roadmap: `You are an expert technical career coach. Create a detailed, step-by-step learning roadmap for the requested topic.
IMPORTANT: Return the response in strict Markdown format exactly like this:

# 🚀 [Topic] Roadmap

## Phase 1: [Phase Name] ([Duration])
✅ [Task 1]
✅ [Task 2]
...

## Phase 2: [Phase Name] ([Duration])
✅ [Task 1]
...

## Resources:
📚 [Resource 1 with link if available]
📚 [Resource 2]
...

Keep it practical, actionable, and structured. Do not add conversational filler before or after the markdown.`
    };

    const systemPrompt = systemPrompts[mode] || systemPrompts.mentor;

    // Format messages for the API
    const formattedMessages = messages
      .filter((m: { content: string }) => m.content && m.content.trim() !== '')
      .map((m: { role: string; content: string }) => ({
        role: m.role === 'assistant' || m.role === 'ai' ? 'assistant' : 'user',
        content: m.content
      }));

    // Call Lovable AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...formattedMessages,
        ],
        stream: false,
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Lovable AI Error:", response.status, errText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ error: "AI service temporarily unavailable. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content || "I couldn't generate a response. Please try again.";

    return new Response(JSON.stringify({ generatedText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("AI Mentor Error:", errorMessage);
    return new Response(JSON.stringify({ error: "An error occurred. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
