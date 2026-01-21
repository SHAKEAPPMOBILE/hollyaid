import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plan configurations
const PLANS = {
  starter: {
    priceId: "price_1SqEi7GdNaB1L9YZi2z1wViF",
    minutes: 500,
  },
  growth: {
    priceId: "price_1SqEiJGdNaB1L9YZCJqfjMTg",
    minutes: 1500,
  },
  scale: {
    priceId: "price_1SqEiVGdNaB1L9YZBSASxzco",
    minutes: 3600,
  },
};

// Test account domains
const TEST_DOMAINS = ["hollyaid.com", "shakeapp.today", "aptw.us"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    // Get request body for plan selection
    const body = await req.json().catch(() => ({}));
    const planType = body.planType || "starter";
    
    const plan = PLANS[planType as keyof typeof PLANS];
    if (!plan) throw new Error("Invalid plan type");

    const emailDomain = user.email.split("@")[1]?.toLowerCase();
    const isTestAccount = TEST_DOMAINS.includes(emailDomain);

    // If test account, activate subscription immediately without Stripe
    if (isTestAccount) {
      console.log(`Test account detected: ${user.email}`);
      
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      
      const { error: updateError } = await supabaseAdmin
        .from("companies")
        .update({
          subscription_status: "active",
          is_paid: true,
          plan_type: planType,
          minutes_included: plan.minutes,
          minutes_used: 0,
          subscription_period_start: now.toISOString(),
          subscription_period_end: periodEnd.toISOString(),
          is_test_account: true,
        })
        .eq("admin_user_id", user.id);

      if (updateError) {
        console.error("Error updating test company:", updateError);
        throw new Error("Failed to activate test subscription");
      }

      return new Response(JSON.stringify({ 
        success: true, 
        isTestAccount: true,
        message: "Test subscription activated" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Regular Stripe checkout for non-test accounts
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://hollyaid.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&plan=${planType}`,
      cancel_url: `${origin}/auth`,
      metadata: {
        user_id: user.id,
        plan_type: planType,
        minutes_included: plan.minutes.toString(),
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Checkout error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
