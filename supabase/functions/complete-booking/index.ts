import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

// Threshold for low minutes warning (80%)
const LOW_MINUTES_THRESHOLD = 0.80;

interface CompleteBookingRequest {
  bookingId: string;
  sessionMinutes?: number;
}

// Function to send low minutes warning email
async function sendLowMinutesEmail(
  adminEmail: string,
  companyName: string,
  minutesUsed: number,
  minutesIncluded: number,
  usagePercentage: number
): Promise<void> {
  const minutesRemaining = minutesIncluded - minutesUsed;
  const hoursRemaining = Math.floor(minutesRemaining / 60);
  const minsRemaining = minutesRemaining % 60;
  const remainingFormatted = hoursRemaining > 0 
    ? `${hoursRemaining}h ${minsRemaining}m` 
    : `${minsRemaining}m`;

  try {
    await resend.emails.send({
      from: "HollyAid <onboarding@resend.dev>",
      to: [adminEmail],
      subject: `⚠️ Low Wellness Minutes Warning - ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
            .usage-bar { background: #e5e7eb; border-radius: 8px; height: 20px; overflow: hidden; margin: 20px 0; }
            .usage-fill { background: linear-gradient(90deg, #f59e0b, #dc2626); height: 100%; transition: width 0.3s; }
            .stat-box { background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 10px 0; border-left: 4px solid #f59e0b; }
            .stat-value { font-size: 28px; font-weight: bold; color: #111827; }
            .stat-label { font-size: 14px; color: #6b7280; }
            .cta { display: inline-block; background: #22c55e; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">⚠️ Low Minutes Warning</h1>
              <p style="margin: 10px 0 0; opacity: 0.9;">Your wellness minutes are running low</p>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>This is a notification that <strong>${companyName}</strong> has used <strong>${Math.round(usagePercentage)}%</strong> of the monthly wellness minutes allocation.</p>
              
              <div class="usage-bar">
                <div class="usage-fill" style="width: ${Math.min(usagePercentage, 100)}%;"></div>
              </div>
              
              <div class="stat-box">
                <div class="stat-value">${remainingFormatted}</div>
                <div class="stat-label">Minutes Remaining</div>
              </div>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div class="stat-box">
                  <div class="stat-value">${minutesUsed}</div>
                  <div class="stat-label">Minutes Used</div>
                </div>
                <div class="stat-box">
                  <div class="stat-value">${minutesIncluded}</div>
                  <div class="stat-label">Monthly Allowance</div>
                </div>
              </div>
              
              <p style="margin-top: 20px;">To ensure uninterrupted access to wellness services, consider upgrading your plan before your minutes run out.</p>
              
              <center>
                <a href="https://hollyaid.com/dashboard" class="cta">
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
    console.log("Low minutes warning email sent to:", adminEmail);
  } catch (error) {
    console.error("Failed to send low minutes email:", error);
    // Don't throw - email failure shouldn't fail the booking completion
  }
}

const handler = async (req: Request): Promise<Response> => {
  console.log("complete-booking function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, sessionMinutes = DEFAULT_SESSION_MINUTES }: CompleteBookingRequest = await req.json();
    console.log("Completing booking:", bookingId, "Session minutes:", sessionMinutes);

    if (!bookingId) {
      throw new Error("bookingId is required");
    }

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

    if (booking.status !== "approved") {
      throw new Error(`Booking cannot be completed. Current status: ${booking.status}`);
    }

    const specialist = booking.specialist as unknown as { id: string; rate_tier: string | null; full_name: string } | null;
    
    if (!specialist) {
      throw new Error("Specialist not found for this booking");
    }

    const tier = specialist.rate_tier || "standard";
    const multiplier = TIER_MULTIPLIERS[tier] || 1.0;
    const minutesToDeduct = Math.ceil(sessionMinutes * multiplier);
    console.log(`Tier: ${tier}, Multiplier: ${multiplier}, Session: ${sessionMinutes}min, Deducting: ${minutesToDeduct} minutes`);

    // Find the employee's company - first try company_employees, then fallback to email domain
    type CompanyType = { 
      id: string; 
      name: string; 
      minutes_used: number | null; 
      minutes_included: number | null;
      admin_user_id: string | null;
    };
    
    let company: CompanyType | null = null;

    // Try to find via company_employees table
    const { data: employeeCompany, error: companyError } = await supabase
      .from("company_employees")
      .select(`
        company_id,
        company:companies!company_employees_company_id_fkey(
          id,
          name,
          minutes_used,
          minutes_included,
          admin_user_id
        )
      `)
      .eq("user_id", booking.employee_user_id)
      .single();

    if (!companyError && employeeCompany?.company) {
      company = employeeCompany.company as unknown as CompanyType;
      console.log("Found company via company_employees:", company.name);
    } else {
      console.log("Employee not in company_employees, trying email domain fallback");
      
      // Fallback: Get employee's email from profiles and match by domain
      const { data: employeeProfile, error: profileError } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", booking.employee_user_id)
        .single();

      if (profileError || !employeeProfile?.email) {
        console.error("Error fetching employee profile:", profileError);
        throw new Error("Employee profile not found");
      }

      const emailDomain = employeeProfile.email.split("@")[1];
      console.log("Looking for company with email domain:", emailDomain);

      const { data: domainCompany, error: domainError } = await supabase
        .from("companies")
        .select("id, name, minutes_used, minutes_included, admin_user_id")
        .eq("email_domain", emailDomain)
        .single();

      if (domainError || !domainCompany) {
        console.error("Error finding company by domain:", domainError);
        throw new Error("Employee's company not found");
      }

      company = domainCompany as CompanyType;
      console.log("Found company via email domain:", company.name);
    }

    if (!company) {
      throw new Error("Company data not found");
    }

    const currentMinutesUsed = company.minutes_used || 0;
    const minutesIncluded = company.minutes_included || 0;
    const newMinutesUsed = currentMinutesUsed + minutesToDeduct;

    // Calculate usage percentages before and after
    const previousUsagePercentage = minutesIncluded > 0 ? (currentMinutesUsed / minutesIncluded) * 100 : 0;
    const newUsagePercentage = minutesIncluded > 0 ? (newMinutesUsed / minutesIncluded) * 100 : 0;
    const thresholdPercentage = LOW_MINUTES_THRESHOLD * 100;

    console.log(`Company: ${company.name}, Current used: ${currentMinutesUsed}, New total: ${newMinutesUsed}`);
    console.log(`Usage: ${previousUsagePercentage.toFixed(1)}% -> ${newUsagePercentage.toFixed(1)}% (threshold: ${thresholdPercentage}%)`);

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

    // Check if usage just crossed the 80% threshold and send email notification
    let lowMinutesEmailSent = false;
    if (previousUsagePercentage < thresholdPercentage && newUsagePercentage >= thresholdPercentage) {
      console.log("Usage crossed 80% threshold - sending notification email");
      
      if (company.admin_user_id) {
        // Get admin email from profiles
        const { data: adminProfile, error: profileError } = await supabase
          .from("profiles")
          .select("email")
          .eq("user_id", company.admin_user_id)
          .single();

        if (!profileError && adminProfile?.email) {
          await sendLowMinutesEmail(
            adminProfile.email,
            company.name,
            newMinutesUsed,
            minutesIncluded,
            newUsagePercentage
          );
          lowMinutesEmailSent = true;
        } else {
          console.error("Could not find admin email:", profileError);
        }
      }
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
        lowMinutesEmailSent,
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
