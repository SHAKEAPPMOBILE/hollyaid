import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotifyBookingRequest {
  bookingId: string;
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
  console.log("notify-specialist-booking function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId }: NotifyBookingRequest = await req.json();
    console.log("Processing booking notification for:", bookingId);

    if (!bookingId) {
      throw new Error("bookingId is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        id,
        proposed_datetime,
        notes,
        specialist:specialists!bookings_specialist_id_fkey(
          id,
          full_name,
          email,
          phone_number
        ),
        employee:profiles!bookings_employee_user_id_fkey(
          full_name,
          email
        )
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("Error fetching booking:", bookingError);
      throw new Error("Booking not found");
    }

    console.log("Booking data:", JSON.stringify(booking, null, 2));

    const specialist = booking.specialist as unknown as { id: string; full_name: string; email: string; phone_number: string | null } | null;
    const employee = booking.employee as unknown as { full_name: string | null; email: string } | null;

    if (!specialist?.email) {
      throw new Error("Specialist email not found");
    }

    const proposedDate = booking.proposed_datetime
      ? new Date(booking.proposed_datetime).toLocaleString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      : "Not specified";

    const employeeName = employee?.full_name || employee?.email || "An employee";

    // Send email
    const emailResponse = await resend.emails.send({
      from: "HollyAid <onboarding@resend.dev>",
      to: [specialist.email],
      subject: `New Booking Request from ${employeeName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
            .detail-row { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #22c55e; }
            .label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
            .value { font-size: 16px; font-weight: 600; color: #111827; margin-top: 4px; }
            .cta { display: inline-block; background: #22c55e; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">🙏 New Booking Request</h1>
              <p style="margin: 10px 0 0; opacity: 0.9;">You have a new consultation request</p>
            </div>
            <div class="content">
              <p>Hello ${specialist.full_name},</p>
              <p>You've received a new booking request from <strong>${employeeName}</strong>.</p>
              
              <div class="detail-row">
                <div class="label">Proposed Date & Time</div>
                <div class="value">📅 ${proposedDate}</div>
              </div>
              
              ${booking.notes ? `
              <div class="detail-row">
                <div class="label">Message from Employee</div>
                <div class="value">💬 "${booking.notes}"</div>
              </div>
              ` : ''}
              
              <p style="margin-top: 20px;">Please log in to your dashboard to accept or decline this request.</p>
              
              <center>
                <a href="https://hollyaid.lovable.app/specialist-dashboard" class="cta">
                  View Request →
                </a>
              </center>
              
              <div class="footer">
                <p>This is an automated notification from HollyAid Wellness.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    // Send WhatsApp notification
    if (specialist.phone_number) {
      const whatsappMessage = `🙏 New Booking Request!\n\nHi ${specialist.full_name}, you have a new booking request from ${employeeName}.\n\n📅 ${proposedDate}\n\n👉 Login to respond: https://hollyaid.lovable.app/auth`;
      await sendWhatsAppNotification(specialist.phone_number, whatsappMessage);
    }

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-specialist-booking function:", error);
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
