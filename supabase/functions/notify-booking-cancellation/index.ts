import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CancellationRequest {
  bookingId: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("notify-booking-cancellation function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId }: CancellationRequest = await req.json();
    console.log("Processing cancellation notification for:", bookingId);

    if (!bookingId) {
      throw new Error("bookingId is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch booking with specialist and employee details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        id,
        proposed_datetime,
        confirmed_datetime,
        notes,
        specialist:specialists!bookings_specialist_id_fkey(
          id,
          full_name,
          email
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

    const specialist = booking.specialist as unknown as { id: string; full_name: string; email: string } | null;
    const employee = booking.employee as unknown as { full_name: string | null; email: string } | null;

    if (!specialist?.email) {
      throw new Error("Specialist email not found");
    }

    // Use confirmed datetime if available, otherwise proposed
    const sessionDate = booking.confirmed_datetime || booking.proposed_datetime;
    const formattedDate = sessionDate
      ? new Date(sessionDate).toLocaleString("en-US", {
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

    // Send cancellation email to specialist
    const emailResponse = await resend.emails.send({
      from: "HollyAid <onboarding@resend.dev>",
      to: [specialist.email],
      subject: `Booking Cancelled by ${employeeName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
            .detail-row { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #ef4444; }
            .label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
            .value { font-size: 16px; font-weight: 600; color: #111827; margin-top: 4px; }
            .cta { display: inline-block; background: #22c55e; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">❌ Booking Cancelled</h1>
              <p style="margin: 10px 0 0; opacity: 0.9;">A confirmed session has been cancelled</p>
            </div>
            <div class="content">
              <p>Hello ${specialist.full_name},</p>
              <p>Unfortunately, <strong>${employeeName}</strong> has cancelled their confirmed booking with you.</p>
              
              <div class="detail-row">
                <div class="label">Scheduled Date & Time</div>
                <div class="value">📅 ${formattedDate}</div>
              </div>
              
              <div class="detail-row">
                <div class="label">Employee</div>
                <div class="value">👤 ${employeeName}</div>
              </div>
              
              <p style="margin-top: 20px;">This time slot is now available for other bookings.</p>
              
              <center>
                <a href="https://hollyaid.com/specialist-dashboard" class="cta">
                  View Dashboard →
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

    console.log("Cancellation email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-booking-cancellation function:", error);
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
