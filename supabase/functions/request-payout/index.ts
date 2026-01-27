import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PayoutRequest {
  payoutRequestId: string;
  specialistId: string;
  amount: number;
  periodStart: string;
  periodEnd: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { payoutRequestId, specialistId, amount, periodStart, periodEnd }: PayoutRequest = await req.json();

    console.log("Processing payout request:", { payoutRequestId, specialistId, amount });

    // Get specialist details
    const { data: specialist, error: specialistError } = await supabaseClient
      .from("specialists")
      .select("full_name, email, rate_tier")
      .eq("id", specialistId)
      .single();

    if (specialistError || !specialist) {
      throw new Error("Specialist not found");
    }

    // Format dates for email
    const startDate = new Date(periodStart).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const endDate = new Date(periodEnd).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    // Send notification email to admin
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      throw new Error("Email service not configured");
    }

    const resend = new Resend(resendApiKey);

    const adminEmail = "info@hollyaid.com";
    
    const { error: emailError } = await resend.emails.send({
      from: "HollyAid <noreply@hollyaid.com>",
      to: [adminEmail],
      subject: `💰 Payout Request: ${specialist.full_name} - $${amount.toFixed(2)}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0d9488, #14b8a6); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; }
            .amount { font-size: 36px; font-weight: bold; color: #0d9488; margin: 20px 0; }
            .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
            .detail-row:last-child { border-bottom: none; }
            .label { color: #64748b; }
            .value { font-weight: 600; }
            .cta { display: inline-block; background: #0d9488; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #94a3b8; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">💰 Payout Request</h1>
            </div>
            <div class="content">
              <p>A specialist has requested a payout:</p>
              
              <div class="amount">$${amount.toFixed(2)}</div>
              
              <div class="details">
                <div class="detail-row">
                  <span class="label">Specialist</span>
                  <span class="value">${specialist.full_name}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Email</span>
                  <span class="value">${specialist.email}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Rate Tier</span>
                  <span class="value">${specialist.rate_tier || 'Standard'}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Period</span>
                  <span class="value">${startDate} - ${endDate}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Request ID</span>
                  <span class="value" style="font-family: monospace; font-size: 12px;">${payoutRequestId}</span>
                </div>
              </div>
              
              <p>Please process this payout at your earliest convenience.</p>
              
              <div class="footer">
                <p>This is an automated notification from HollyAid</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      throw new Error(`Failed to send notification email: ${emailError.message}`);
    }

    console.log("Payout request notification sent successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Payout request submitted and notification sent" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error processing payout request:", errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
