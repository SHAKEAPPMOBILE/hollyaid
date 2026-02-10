import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  employeeEmail: string;
  companyId: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-employee-invite function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { employeeEmail, companyId }: InviteRequest = await req.json();
    console.log("Sending invite to:", employeeEmail, "for company:", companyId);

    if (!employeeEmail || !companyId) {
      throw new Error("employeeEmail and companyId are required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch company details
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .single();

    if (companyError || !company) {
      console.error("Error fetching company:", companyError);
      throw new Error("Company not found");
    }

    // Send invitation email
    const emailResponse = await resend.emails.send({
      from: "HollyAid <onboarding@resend.dev>",
      to: [employeeEmail],
      subject: `You're invited to join ${company.name} on HollyAid`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
            .cta { display: inline-block; background: #22c55e; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            .benefit { display: flex; align-items: center; gap: 10px; margin: 10px 0; }
            .benefit-icon { width: 24px; height: 24px; background: #22c55e; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">🎉 You're Invited!</h1>
              <p style="margin: 10px 0 0; opacity: 0.9;">Join your company's wellness program</p>
            </div>
            <div class="content">
              <p>Hello!</p>
              <p><strong>${company.name}</strong> has invited you to join their wellness program on HollyAid.</p>
              
              <p style="margin-top: 20px; font-weight: 600;">What you'll get access to:</p>
              <div class="benefit">
                <div class="benefit-icon">✓</div>
                <span>Book sessions with certified wellness specialists</span>
              </div>
              <div class="benefit">
                <div class="benefit-icon">✓</div>
                <span>Access to mental health, fitness, and nutrition experts</span>
              </div>
              <div class="benefit">
                <div class="benefit-icon">✓</div>
                <span>Private video consultations at no cost to you</span>
              </div>
              
              <center>
                <a href="https://hollyaid.com/employee-signup" class="cta">
                  Create Your Account →
                </a>
              </center>
              
              <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                Sign up using this email address (${employeeEmail}) to automatically join ${company.name}.
              </p>
              
              <div class="footer">
                <p>This is an automated invitation from HollyAid Wellness.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Invitation email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-employee-invite function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
