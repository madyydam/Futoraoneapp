/**
 * Supabase Edge Function to send FCM notifications
 * This keeps Firebase service account secure on the backend
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { create, getNumericDate } from 'https://deno.land/x/djwt@v2.8/mod.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
    userIds?: string[]; // For bulk
    tokens?: string[]; // For specific tokens
    title: string;
    body: string;
    data?: Record<string, unknown>;
}

interface ServiceAccount {
    project_id: string;
    client_email: string;
    private_key: string;
}

// Helper to get FCM Access Token using Service Account
async function getAccessToken(serviceAccount: ServiceAccount) {
    const header = { alg: "RS256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iss: serviceAccount.client_email,
        sub: serviceAccount.client_email,
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
        scope: "https://www.googleapis.com/auth/cloud-platform"
    };

    // Construct private key correctly
    const pem = serviceAccount.private_key.replace(/\\n/g, '\n');

    // Import the key
    const binaryKey = str2ab(pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, ""));
    const key = await crypto.subtle.importKey(
        "pkcs8",
        binaryKey,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const jwt = await create(header, payload, key);

    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: jwt
        })
    });

    const data = await response.json();
    return data.access_token;
}

// Convert string to ArrayBuffer for key import
function str2ab(str: string) {
    const binaryString = atob(str);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const FCM_SERVICE_ACCOUNT_JSON = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');
        if (!FCM_SERVICE_ACCOUNT_JSON) {
            throw new Error('FCM_SERVICE_ACCOUNT_JSON is not set');
        }

        const serviceAccount = JSON.parse(FCM_SERVICE_ACCOUNT_JSON);
        const { tokens, title, body, data = {} }: NotificationRequest = await req.json();

        if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
            return new Response(JSON.stringify({ error: 'Tokens are required' }), { status: 400, headers: corsHeaders });
        }

        console.log(`FCM: Fetching access token for project ${serviceAccount.project_id}...`);
        const accessToken = await getAccessToken(serviceAccount);
        const endpoint = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;

        const results = [];
        for (const token of tokens) {
            try {
                const message = {
                    message: {
                        token: token,
                        notification: { title, body },
                        data: data as Record<string, string>,
                        webpush: {
                            notification: {
                                icon: '/app-icon.png',
                                badge: '/favicon.png',
                                click_action: '/'
                            }
                        }
                    }
                };

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(message)
                });

                const resData = await response.json();
                results.push({ token: token.substring(0, 10), status: response.status, data: resData });
            } catch (err) {
                results.push({ token: token.substring(0, 10), error: (err as Error).message });
            }
        }

        return new Response(JSON.stringify({ results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error) {
        console.error('FCM Error:', error);
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        });
    }
});
