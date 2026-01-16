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
    const { bookingId } = await req.json();
    if (!bookingId) throw new Error("Booking ID is required");

    // Get booking details with related data
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select(`
        id,
        status,
        confirmed_datetime,
        meeting_link,
        notes,
        employee_user_id,
        specialist_id
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found");
    }

    // Get employee details
    const { data: employee } = await supabaseClient
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', booking.employee_user_id)
      .single();

    // Get specialist details
    const { data: specialist } = await supabaseClient
      .from('specialists')
      .select('email, full_name, specialty')
      .eq('id', booking.specialist_id)
      .single();

    if (!employee || !specialist) {
      throw new Error("Could not find employee or specialist details");
    }

    const meetingDate = booking.confirmed_datetime 
      ? new Date(booking.confirmed_datetime).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'TBD';
    
    const meetingTime = booking.confirmed_datetime
      ? new Date(booking.confirmed_datetime).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        })
      : 'TBD';

    const emailTemplate = (recipientName: string, recipientRole: string) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Booking Confirmed!</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
          <p style="font-size: 18px; margin-top: 0;">Hello ${recipientName},</p>
          <p>Your ${recipientRole === 'employee' ? 'session' : 'appointment'} has been confirmed!</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <p style="margin: 0 0 10px 0;"><strong>📅 Date:</strong> ${meetingDate}</p>
            <p style="margin: 0 0 10px 0;"><strong>🕐 Time:</strong> ${meetingTime}</p>
            <p style="margin: 0 0 10px 0;"><strong>👤 ${recipientRole === 'employee' ? 'Specialist' : 'With'}:</strong> ${recipientRole === 'employee' ? specialist.full_name : employee.full_name || employee.email}</p>
            ${specialist.specialty ? `<p style="margin: 0;"><strong>📋 Specialty:</strong> ${specialist.specialty}</p>` : ''}
          </div>

          ${booking.meeting_link ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${booking.meeting_link}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Join Meeting</a>
          </div>
          <p style="color: #666; font-size: 14px; text-align: center;">Or copy this link: <a href="${booking.meeting_link}" style="color: #10b981;">${booking.meeting_link}</a></p>
          ` : ''}

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #666; font-size: 14px; margin-bottom: 0;">Best regards,<br>The HollyAid Team</p>
        </div>
      </body>
      </html>
    `;

    // Send email to employee
    const employeeEmail = await resend.emails.send({
      from: "HollyAid <onboarding@resend.dev>",
      to: [employee.email],
      subject: "Your Booking is Confirmed! 🎉",
      html: emailTemplate(employee.full_name || 'there', 'employee'),
    });

    console.log("Employee email sent:", employeeEmail);

    // Send email to specialist
    const specialistEmail = await resend.emails.send({
      from: "HollyAid <onboarding@resend.dev>",
      to: [specialist.email],
      subject: "New Appointment Confirmed",
      html: emailTemplate(specialist.full_name, 'specialist'),
    });

    console.log("Specialist email sent:", specialistEmail);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Confirmation emails sent successfully",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Send booking confirmation error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
