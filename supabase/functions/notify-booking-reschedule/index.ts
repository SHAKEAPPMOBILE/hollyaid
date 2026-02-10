import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, notifyEmployee } = await req.json();

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: "Missing bookingId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch booking details with specialist and employee info
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, proposed_datetime, specialist_id, employee_user_id")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("Error fetching booking:", bookingError);
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch specialist details
    const { data: specialist, error: specialistError } = await supabase
      .from("specialists")
      .select("email, full_name, phone_number")
      .eq("id", booking.specialist_id)
      .single();

    if (specialistError || !specialist) {
      console.error("Error fetching specialist:", specialistError);
      return new Response(
        JSON.stringify({ error: "Specialist not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch employee details
    const { data: employee, error: employeeError } = await supabase
      .from("profiles")
      .select("email, full_name, phone_number")
      .eq("user_id", booking.employee_user_id)
      .single();

    if (employeeError || !employee) {
      console.error("Error fetching employee:", employeeError);
      return new Response(
        JSON.stringify({ error: "Employee not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format the proposed datetime
    const proposedDate = booking.proposed_datetime
      ? new Date(booking.proposed_datetime).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Not specified";

    const proposedTime = booking.proposed_datetime
      ? new Date(booking.proposed_datetime).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      : "Not specified";

    // Send email to specialist (default behavior - employee reschedules)
    if (!notifyEmployee) {
      await resend.emails.send({
        from: "HollyAid <onboarding@resend.dev>",
        to: [specialist.email],
        subject: `Booking Reschedule Request from ${employee.full_name || employee.email}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">Reschedule Request</h2>
            <p>Hello ${specialist.full_name},</p>
            <p><strong>${employee.full_name || employee.email}</strong> has requested to reschedule their session with you.</p>
            
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #374151;">New Proposed Time</h3>
              <p style="margin: 8px 0;"><strong>Date:</strong> ${proposedDate}</p>
              <p style="margin: 8px 0;"><strong>Time:</strong> ${proposedTime}</p>
            </div>
            
            <p>Please log in to your HollyAid dashboard to accept or decline this reschedule request.</p>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This is an automated message from HollyAid. Please do not reply directly to this email.
            </p>
          </div>
        `,
      });

      // Send WhatsApp to specialist
      if (specialist.phone_number) {
        const whatsappMessage = `📅 Reschedule Request\n\n${employee.full_name || 'An employee'} wants to reschedule their session.\n\n📆 New time: ${proposedDate} at ${proposedTime}\n\n👉 Respond: https://hollyaid.com/auth`;
        await sendWhatsAppNotification(specialist.phone_number, whatsappMessage);
      }

      console.log("Reschedule notification sent to specialist:", specialist.email);
    } else {
      // Notify employee (specialist initiated reschedule)
      await resend.emails.send({
        from: "HollyAid <onboarding@resend.dev>",
        to: [employee.email],
        subject: `Your Booking Has Been Rescheduled`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">Booking Rescheduled</h2>
            <p>Hello ${employee.full_name || 'there'},</p>
            <p><strong>${specialist.full_name}</strong> has proposed a new time for your session.</p>
            
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #374151;">New Proposed Time</h3>
              <p style="margin: 8px 0;"><strong>Date:</strong> ${proposedDate}</p>
              <p style="margin: 8px 0;"><strong>Time:</strong> ${proposedTime}</p>
            </div>
            
            <p>Please log in to your HollyAid dashboard to view the updated booking.</p>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This is an automated message from HollyAid. Please do not reply directly to this email.
            </p>
          </div>
        `,
      });

      // Send WhatsApp to employee
      if (employee.phone_number) {
        const whatsappMessage = `📅 Booking Rescheduled\n\n${specialist.full_name} has proposed a new time for your session.\n\n📆 ${proposedDate} at ${proposedTime}\n\n👉 View details: https://hollyaid.com/dashboard`;
        await sendWhatsAppNotification(employee.phone_number, whatsappMessage);
      }

      console.log("Reschedule notification sent to employee:", employee.email);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in notify-booking-reschedule:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
