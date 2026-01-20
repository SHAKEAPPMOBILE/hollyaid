import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId } = await req.json();

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: "Missing bookingId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

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
      .select("email, full_name")
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
      .select("email, full_name")
      .eq("user_id", booking.employee_user_id)
      .single();

    if (employeeError || !employee) {
      console.error("Error fetching employee:", employeeError);
      return new Response(
        JSON.stringify({ error: "Employee not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, skipping email notification");
      return new Response(
        JSON.stringify({ success: true, message: "Email skipped - no API key" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Send email to specialist
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "HollyAid <noreply@hollyaid.lovable.app>",
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
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Resend API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Reschedule notification sent successfully to:", specialist.email);

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
