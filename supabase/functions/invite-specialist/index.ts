import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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

    // In a real implementation, you would send an email here using a service like Resend
    // For now, we'll just return the invitation link
    const origin = req.headers.get("origin") || "https://hollyaid.lovable.app";
    const invitationLink = `${origin}/specialist-signup?token=${invitationToken}&email=${encodeURIComponent(specialist.email)}`;

    console.log(`Invitation link for ${specialist.email}: ${invitationLink}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Invitation prepared for ${specialist.email}`,
      invitationLink // For testing purposes - in production this would be sent via email
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
