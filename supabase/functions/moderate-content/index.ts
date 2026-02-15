import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { content } = await req.json();
        const apiKey = Deno.env.get('OPENAI_API_KEY');

        if (!apiKey) {
            return new Response(JSON.stringify({ error: "OPENAI_API_KEY is not set" }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        if (!content || content.trim().length === 0) {
            return new Response(JSON.stringify({ error: "Content is required" }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log(`Moderating content: ${content.substring(0, 50)}...`);

        const response = await fetch('https://api.openai.com/v1/moderations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ input: content }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('OpenAI Moderation API error:', data);
            throw new Error(data.error?.message || 'Failed to moderate content');
        }

        const results = data.results[0];

        return new Response(JSON.stringify({
            flagged: results.flagged,
            categories: results.categories,
            category_scores: results.category_scores,
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error('Moderation Function Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
