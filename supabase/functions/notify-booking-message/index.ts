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

async function sendWhatsAppNotification(to: string, message: string) {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioWhatsAppNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER");

  if (!accountSid || !authToken || !twilioWhatsAppNumber || !to) {
    console.log("WhatsApp not configured or no phone number");
    return;
  }

  try {
    let formattedTo = to.replace(/\s+/g, '').replace(/[^+\d]/g, '');
    if (!formattedTo.startsWith('+')) {
      formattedTo = '+' + formattedTo;
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const formData = new URLSearchParams();
    formData.append('To', `whatsapp:${formattedTo}`);
    formData.append('From', `whatsapp:${twilioWhatsAppNumber}`);
    formData.append('Body', message);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json();
    console.log("WhatsApp notification result:", data);
  } catch (error) {
    console.error("WhatsApp notification error:", error);
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, senderType, messagePreview }: NotifyMessageRequest = await req.json();
    
    console.log(`Processing message notification for booking ${bookingId} from ${senderType}`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select("id, employee_user_id, specialist_id")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("Error fetching booking:", bookingError);
      throw new Error("Booking not found");
    }

    const { data: employeeProfile } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name, phone_number")
      .eq("user_id", booking.employee_user_id)
      .single();

    const { data: specialist } = await supabaseAdmin
      .from("specialists")
      .select("email, full_name, phone_number")
      .eq("id", booking.specialist_id)
      .single();

    if (!employeeProfile || !specialist) {
      console.error("Could not find employee or specialist profiles");
      throw new Error("Profiles not found");
    }

    const recipientEmail = senderType === "employee" ? specialist.email : employeeProfile.email;
    const recipientPhone = senderType === "employee" ? specialist.phone_number : employeeProfile.phone_number;
    const recipientName = senderType === "employee" 
      ? (specialist.full_name || "Specialist") 
      : (employeeProfile.full_name || "Employee");
    const senderName = senderType === "employee" 
      ? (employeeProfile.full_name || "An employee") 
      : (specialist.full_name || "A specialist");

    console.log(`Sending notification to ${recipientEmail}`);

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
              <a href="https://hollyaid.com" style="display: inline-block; background: #10b981; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Conversation</a>
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

    // Send WhatsApp notification
    if (recipientPhone) {
      const whatsappMessage = `💬 New Message from ${senderName}\n\n"${truncatedMessage}"\n\n👉 Reply now: https://hollyaid.com/auth`;
      await sendWhatsAppNotification(recipientPhone, whatsappMessage);
    }

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
