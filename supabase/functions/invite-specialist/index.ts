import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    // Check if user is admin
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      throw new Error("Only admins can invite specialists");
    }

    const { specialistId } = await req.json();
    if (!specialistId) throw new Error("Specialist ID is required");

    // Get specialist details
    const { data: specialist, error: specError } = await supabaseClient
      .from('specialists')
      .select('*')
      .eq('id', specialistId)
      .single();

    if (specError || !specialist) {
      throw new Error("Specialist not found");
    }

    // Check if already accepted
    if (specialist.user_id) {
      throw new Error("This specialist has already registered");
    }

    // Generate invitation token and update specialist
    const invitationToken = crypto.randomUUID();
    const { error: updateError } = await supabaseClient
      .from('specialists')
      .update({
        invitation_token: invitationToken,
        invitation_sent_at: new Date().toISOString(),
      })
      .eq('id', specialistId);

    if (updateError) {
      throw new Error(`Failed to update specialist: ${updateError.message}`);
    }

    // Build invitation link
    const origin = req.headers.get("origin") || "https://hollyaid.lovable.app";
    const invitationLink = `${origin}/specialist-signup?token=${invitationToken}&email=${encodeURIComponent(specialist.email)}`;

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "HollyAid <onboarding@resend.dev>",
      to: [specialist.email],
      subject: "You're Invited to Join HollyAid as a Specialist",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to HollyAid!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
            <p style="font-size: 18px; margin-top: 0;">Hello ${specialist.full_name},</p>
            <p>You've been invited to join HollyAid as a <strong>${specialist.specialty}</strong> specialist.</p>
            <p>As a specialist on our platform, you'll be able to:</p>
            <ul style="padding-left: 20px;">
              <li>Set your available consultation times</li>
              <li>Connect with employees from registered companies</li>
              <li>Manage your bookings and schedule</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationLink}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Complete Your Registration</a>
            </div>
            <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; font-size: 12px; color: #888;">${invitationLink}</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #666; font-size: 14px; margin-bottom: 0;">Best regards,<br>The HollyAid Team</p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Invitation email sent to ${specialist.email}`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Invite specialist error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
