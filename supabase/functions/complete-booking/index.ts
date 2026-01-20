import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Specialist tier multipliers matching src/lib/plans.ts
const TIER_MULTIPLIERS: Record<string, number> = {
  standard: 1.0,
  advanced: 1.6,
  expert: 2.4,
  master: 3.2,
};

// Default session duration in minutes (1 hour)
const DEFAULT_SESSION_MINUTES = 60;

interface CompleteBookingRequest {
  bookingId: string;
  sessionMinutes?: number; // Optional: actual session duration, defaults to 60
}

const handler = async (req: Request): Promise<Response> => {
  console.log("complete-booking function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, sessionMinutes = DEFAULT_SESSION_MINUTES }: CompleteBookingRequest = await req.json();
    console.log("Completing booking:", bookingId, "Session minutes:", sessionMinutes);

    if (!bookingId) {
      throw new Error("bookingId is required");
    }

    // Create Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch booking with specialist tier and employee info
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        id,
        status,
        employee_user_id,
        specialist:specialists!bookings_specialist_id_fkey(
          id,
          rate_tier,
          full_name
        )
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("Error fetching booking:", bookingError);
      throw new Error("Booking not found");
    }

    console.log("Booking data:", JSON.stringify(booking, null, 2));

    // Verify booking is in approved status
    if (booking.status !== "approved") {
      throw new Error(`Booking cannot be completed. Current status: ${booking.status}`);
    }

    const specialist = booking.specialist as unknown as { id: string; rate_tier: string | null; full_name: string } | null;
    
    if (!specialist) {
      throw new Error("Specialist not found for this booking");
    }

    // Get the tier multiplier (default to standard if not set)
    const tier = specialist.rate_tier || "standard";
    const multiplier = TIER_MULTIPLIERS[tier] || 1.0;
    
    // Calculate minutes to deduct
    const minutesToDeduct = Math.ceil(sessionMinutes * multiplier);
    console.log(`Tier: ${tier}, Multiplier: ${multiplier}, Session: ${sessionMinutes}min, Deducting: ${minutesToDeduct} minutes`);

    // Find the employee's company
    const { data: employeeCompany, error: companyError } = await supabase
      .from("company_employees")
      .select(`
        company_id,
        company:companies!company_employees_company_id_fkey(
          id,
          name,
          minutes_used,
          minutes_included
        )
      `)
      .eq("user_id", booking.employee_user_id)
      .single();

    if (companyError || !employeeCompany) {
      console.error("Error fetching employee company:", companyError);
      throw new Error("Employee's company not found");
    }

    const company = employeeCompany.company as unknown as { 
      id: string; 
      name: string; 
      minutes_used: number | null; 
      minutes_included: number | null;
    } | null;

    if (!company) {
      throw new Error("Company data not found");
    }

    const currentMinutesUsed = company.minutes_used || 0;
    const newMinutesUsed = currentMinutesUsed + minutesToDeduct;

    console.log(`Company: ${company.name}, Current used: ${currentMinutesUsed}, New total: ${newMinutesUsed}`);

    // Update company minutes_used
    const { error: updateCompanyError } = await supabase
      .from("companies")
      .update({ minutes_used: newMinutesUsed })
      .eq("id", company.id);

    if (updateCompanyError) {
      console.error("Error updating company minutes:", updateCompanyError);
      throw new Error("Failed to update company minutes");
    }

    // Mark booking as completed
    const { error: updateBookingError } = await supabase
      .from("bookings")
      .update({ status: "completed" })
      .eq("id", bookingId);

    if (updateBookingError) {
      console.error("Error completing booking:", updateBookingError);
      throw new Error("Failed to complete booking");
    }

    console.log("Booking completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        minutesDeducted: minutesToDeduct,
        tier,
        multiplier,
        sessionMinutes,
        companyName: company.name,
        totalMinutesUsed: newMinutesUsed,
        minutesIncluded: company.minutes_included,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in complete-booking function:", error);
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
