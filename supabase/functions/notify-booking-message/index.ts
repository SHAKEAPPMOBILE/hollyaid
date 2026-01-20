import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyMessageRequest {
  bookingId: string;
  senderType: "employee" | "specialist";
  messagePreview: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, senderType, messagePreview }: NotifyMessageRequest = await req.json();
    
    console.log(`Processing message notification for booking ${bookingId} from ${senderType}`);

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch booking details with employee and specialist info
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select("id, employee_user_id, specialist_id")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("Error fetching booking:", bookingError);
      throw new Error("Booking not found");
    }

    // Get employee profile
    const { data: employeeProfile } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", booking.employee_user_id)
      .single();

    // Get specialist info
    const { data: specialist } = await supabaseAdmin
      .from("specialists")
      .select("email, full_name")
      .eq("id", booking.specialist_id)
      .single();

    if (!employeeProfile || !specialist) {
      console.error("Could not find employee or specialist profiles");
      throw new Error("Profiles not found");
    }

    // Determine recipient based on sender type
    const recipientEmail = senderType === "employee" ? specialist.email : employeeProfile.email;
    const recipientName = senderType === "employee" 
      ? (specialist.full_name || "Specialist") 
      : (employeeProfile.full_name || "Employee");
    const senderName = senderType === "employee" 
      ? (employeeProfile.full_name || "An employee") 
      : (specialist.full_name || "A specialist");

    console.log(`Sending notification to ${recipientEmail}`);

    // Truncate message preview
    const truncatedMessage = messagePreview.length > 100 
      ? messagePreview.substring(0, 100) + "..." 
      : messagePreview;

    const emailResponse = await resend.emails.send({
      from: "HollyAid <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `New message from ${senderName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">New Message</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
            <p style="margin-top: 0;">Hi ${recipientName},</p>
            
            <p><strong>${senderName}</strong> sent you a new message regarding your booking:</p>
            
            <div style="background: white; border-left: 4px solid #10b981; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <p style="margin: 0; color: #555; font-style: italic;">"${truncatedMessage}"</p>
            </div>
            
            <p>Log in to your HollyAid account to view the full conversation and respond.</p>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://hollyaid.lovable.app" style="display: inline-block; background: #10b981; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Conversation</a>
            </div>
            
            <p style="margin-top: 30px; font-size: 14px; color: #666;">
              Best regards,<br>
              The HollyAid Team
            </p>
          </div>
          
          <p style="text-align: center; font-size: 12px; color: #999; margin-top: 20px;">
            This is an automated notification from HollyAid.
          </p>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-booking-message function:", error);
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
