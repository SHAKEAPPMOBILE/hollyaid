import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as jose from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TokenRequest {
  roomName: string;
  userName: string;
  userEmail: string;
  userId: string;
  avatarUrl?: string;
  isModerator?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const privateKeyPem = Deno.env.get('JAAS_PRIVATE_KEY');
    const apiKeyId = Deno.env.get('JAAS_API_KEY_ID');

    if (!privateKeyPem || !apiKeyId) {
      console.error('Missing JaaS credentials');
      return new Response(
        JSON.stringify({ error: 'JaaS not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: TokenRequest = await req.json();
    const { roomName, userName, userEmail, userId, avatarUrl, isModerator = false } = body;

    if (!roomName || !userName || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: roomName, userName, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract App ID from API Key ID (format: vpaas-magic-cookie-xxx/keyid-name)
    const appId = apiKeyId.split('/')[0];

    console.log('Generating JaaS token for:', { roomName, userName, userEmail, appId });

    // Import the private key
    const privateKey = await jose.importPKCS8(privateKeyPem, 'RS256');

    // Create JWT payload per JaaS specs
    const now = Math.floor(Date.now() / 1000);
    const exp = now + (24 * 60 * 60); // 24 hours

    const payload = {
      aud: 'jitsi',
      iss: 'chat',
      iat: now,
      exp: exp,
      nbf: now - 5,
      sub: appId,
      room: roomName,
      context: {
        user: {
          id: userId,
          name: userName,
          email: userEmail || '',
          avatar: avatarUrl || '',
          moderator: isModerator,
          'hidden-from-recorder': false,
        },
        features: {
          livestreaming: true,
          'outbound-call': false,
          'sip-outbound-call': false,
          transcription: true,
          recording: true,
        },
      },
    };

    // Sign the JWT
    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256', kid: apiKeyId, typ: 'JWT' })
      .sign(privateKey);

    // Construct the meeting URL with config to skip prejoin screen
    // Config options: https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe
    const configParams = [
      'config.prejoinPageEnabled=false',
      'config.startWithAudioMuted=false',
      'config.startWithVideoMuted=false',
      'config.disableDeepLinking=true',
    ].join('&');
    
    const meetingUrl = `https://8x8.vc/${appId}/${roomName}?jwt=${jwt}#${configParams}`;

    console.log('Token generated successfully for room:', roomName);

    return new Response(
      JSON.stringify({ 
        token: jwt, 
        meetingUrl,
        roomName: `${appId}/${roomName}`,
        expiresAt: new Date(exp * 1000).toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error generating JaaS token:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Failed to generate token', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
