import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plan configurations
const PLANS: Record<string, { minutes: number }> = {
  starter: { minutes: 500 },
  growth: { minutes: 1500 },
  scale: { minutes: 3600 },
};

const PRODUCT_TO_PLAN: Record<string, string> = {
  "prod_TnqOv9nQuyjGf6": "starter",
  "prod_TnqPkq4mEodBDu": "growth",
  "prod_TnqPblqQcc6hnM": "scale",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    // First check if company exists and is a test account
    const { data: company } = await supabaseClient
      .from("companies")
      .select("*")
      .eq("admin_user_id", user.id)
      .single();

    if (company?.is_test_account && company?.subscription_status === "active") {
      console.log("Test account with active subscription:", user.email);
      return new Response(JSON.stringify({
        subscribed: true,
        plan_type: company.plan_type,
        minutes_included: company.minutes_included,
        minutes_used: company.minutes_used,
        subscription_end: company.subscription_period_end,
        is_test_account: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Regular Stripe check for non-test accounts
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let planType = null;
    let minutesIncluded = 0;
    let subscriptionEnd = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      const productId = subscription.items.data[0].price.product as string;
      planType = PRODUCT_TO_PLAN[productId] || "starter";
      minutesIncluded = PLANS[planType]?.minutes || 500;

      // Update company subscription info
      const periodStart = new Date(subscription.current_period_start * 1000).toISOString();
      
      await supabaseClient
        .from("companies")
        .update({
          subscription_status: "active",
          is_paid: true,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          plan_type: planType,
          minutes_included: minutesIncluded,
          subscription_period_start: periodStart,
          subscription_period_end: subscriptionEnd,
        })
        .eq("admin_user_id", user.id);
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      plan_type: planType,
      minutes_included: minutesIncluded,
      minutes_used: company?.minutes_used || 0,
      subscription_end: subscriptionEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Check subscription error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
