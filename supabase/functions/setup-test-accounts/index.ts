import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Test account configurations
const TEST_ACCOUNTS = [
  {
    email: "test-employee@hollyaid.com",
    password: "test1234",
    fullName: "Test Employee",
    role: "employee",
  },
  {
    email: "test-company@hollyaid.com", 
    password: "test1234",
    fullName: "Test Company Admin",
    role: "company_admin",
  },
  {
    email: "test-specialist@hollyaid.com",
    password: "test1234", 
    fullName: "Test Specialist (Demo)",
    role: "specialist",
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const results: { email: string; status: string; error?: string }[] = [];

    for (const account of TEST_ACCOUNTS) {
      try {
        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users.find(u => u.email === account.email);

        let userId: string;

        if (existingUser) {
          userId = existingUser.id;
          results.push({ email: account.email, status: "already_exists" });
        } else {
          // Create the user
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: account.email,
            password: account.password,
            email_confirm: true,
            user_metadata: {
              full_name: account.fullName,
            },
          });

          if (createError) {
            results.push({ email: account.email, status: "error", error: createError.message });
            continue;
          }

          userId = newUser.user.id;
          results.push({ email: account.email, status: "created" });
        }

        // Assign role
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .upsert({
            user_id: userId,
            role: account.role,
          }, { onConflict: "user_id,role" });

        if (roleError) {
          console.error(`Error assigning role for ${account.email}:`, roleError);
        }

        // Handle role-specific setup
        if (account.role === "company_admin") {
          // Link to test company
          const { data: company } = await supabaseAdmin
            .from("companies")
            .select("id")
            .eq("email_domain", "test-hollyaid.com")
            .single();

          if (company) {
            await supabaseAdmin
              .from("companies")
              .update({ admin_user_id: userId })
              .eq("id", company.id);
          }
        } else if (account.role === "specialist") {
          // Link to test specialist
          await supabaseAdmin
            .from("specialists")
            .update({ user_id: userId, invitation_accepted_at: new Date().toISOString() })
            .eq("email", account.email);
        } else if (account.role === "employee") {
          // Add to test company as employee
          const { data: company } = await supabaseAdmin
            .from("companies")
            .select("id")
            .eq("email_domain", "test-hollyaid.com")
            .single();

          if (company) {
            await supabaseAdmin
              .from("company_employees")
              .upsert({
                company_id: company.id,
                user_id: userId,
                email: account.email,
                status: "accepted",
                accepted_at: new Date().toISOString(),
              }, { onConflict: "company_id,email" });
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        results.push({ email: account.email, status: "error", error: errorMessage });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        accounts: results,
        credentials: TEST_ACCOUNTS.map(a => ({ email: a.email, password: a.password, role: a.role })),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Setup error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
