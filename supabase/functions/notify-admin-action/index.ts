import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

async function sendEmail(to: string[], subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "HollyAid Admin <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });
  
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to send email: ${error}`);
  }
  
  return res.json();
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AdminActionRequest {
  actionType: string;
  targetType: string;
  targetName: string | null;
  adminEmail: string;
  details?: Record<string, any>;
}

const NOTIFICATION_RECIPIENTS = [
  "info@hollyaid.com",
  "contact@shakeapp.today",
];

const ACTION_LABELS: Record<string, string> = {
  delete_specialist: "Specialist Deleted",
  deactivate_specialist: "Specialist Deactivated",
  activate_specialist: "Specialist Activated",
  invite_specialist: "Specialist Invited",
  add_specialist: "Specialist Added",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { actionType, targetType, targetName, adminEmail, details }: AdminActionRequest = await req.json();

    console.log("Received admin action notification request:", { actionType, targetType, targetName, adminEmail });

    // Only send notifications for critical actions
    const criticalActions = ["delete_specialist", "deactivate_specialist"];
    if (!criticalActions.includes(actionType)) {
      console.log("Action is not critical, skipping notification:", actionType);
      return new Response(
        JSON.stringify({ success: true, message: "Non-critical action, notification skipped" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const actionLabel = ACTION_LABELS[actionType] || actionType;
    const timestamp = new Date().toLocaleString("en-US", {
      timeZone: "Europe/London",
      dateStyle: "full",
      timeStyle: "short",
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                ⚠️ Critical Admin Action
              </h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; border-radius: 0 8px 8px 0; margin-bottom: 25px;">
                <p style="margin: 0; color: #991b1b; font-weight: 600; font-size: 16px;">
                  ${actionLabel}
                </p>
              </div>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5; color: #666666; width: 140px;">Action</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5; color: #1a1a1a; font-weight: 500;">${actionLabel}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5; color: #666666;">Target</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5; color: #1a1a1a; font-weight: 500;">${targetName || "Unknown"}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5; color: #666666;">Performed By</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5; color: #1a1a1a; font-weight: 500;">${adminEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; color: #666666;">Timestamp</td>
                  <td style="padding: 12px 0; color: #1a1a1a; font-weight: 500;">${timestamp}</td>
                </tr>
              </table>
              
              ${details ? `
              <div style="margin-top: 25px; padding: 15px; background-color: #f9fafb; border-radius: 8px;">
                <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; font-weight: 500;">Additional Details:</p>
                <pre style="margin: 0; font-family: monospace; font-size: 12px; color: #1a1a1a; white-space: pre-wrap; word-break: break-word;">${JSON.stringify(details, null, 2)}</pre>
              </div>
              ` : ""}
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; color: #666666; font-size: 12px;">
                This is an automated notification from the HollyAid Admin System.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send to all notification recipients except the admin who performed the action
    const recipients = NOTIFICATION_RECIPIENTS.filter(
      (email) => email.toLowerCase() !== adminEmail.toLowerCase()
    );

    if (recipients.length === 0) {
      console.log("No other recipients to notify");
      return new Response(
        JSON.stringify({ success: true, message: "No other recipients to notify" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Sending notification to:", recipients);

    const emailResponse = await sendEmail(
      recipients,
      `⚠️ Admin Alert: ${actionLabel} - ${targetName || "Unknown"}`,
      emailHtml
    );

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-admin-action function:", error);
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
