import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const APP_URL = 'https://hollyaidapp.netlify.app'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  try {
    const { email } = await req.json()
    if (!email) return new Response(JSON.stringify({ error: 'Email required' }), { status: 400 })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${APP_URL}/auth/callback?type=recovery` }
    })

    if (error || !data?.properties?.action_link) {
      return new Response(JSON.stringify({ error: error?.message || 'Could not generate link' }), { status: 400 })
    }

    const resetLink = data.properties.action_link

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'noreply@hollyaid.com',
        to: email,
        subject: 'Reset your Hollyaid password',
        html: `
          <h2>Reset your password</h2>
          <p>Click the button below to reset your password:</p>
          <a href="${resetLink}" style="background:#10b981;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0">Reset Password</a>
          <p>If you didn't request this, ignore this email.</p>
        `
      })
    })

    if (!emailRes.ok) {
      const err = await emailRes.text()
      return new Response(JSON.stringify({ error: err }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Access-Control-Allow-Origin': '*' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
})
