import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type BreakdownRow = {
  week_start: string;
  minutes_used: number;
};

function startOfWeekUTC(d: Date) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay(); // 0=Sun
  const diffToMonday = (day + 6) % 7; // Monday=0
  date.setUTCDate(date.getUTCDate() - diffToMonday);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function addWeeksUTC(d: Date, weeks: number) {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + weeks * 7);
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);

    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");

    // Resolve company by direct ownership first.
    const { data: ownedCompanies, error: ownedCompanyError } = await supabaseClient
      .from("companies")
      .select("id")
      .eq("admin_user_id", user.id)
      .limit(1);

    if (ownedCompanyError) {
      throw ownedCompanyError;
    }

    let companyId = ownedCompanies?.[0]?.id ?? null;

    const { data: roleRow, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "company_admin")
      .maybeSingle();

    if (roleError) {
      throw roleError;
    }

    const hasCompanyAdminRole = !!roleRow;

    if (!companyId && hasCompanyAdminRole) {
      const { data: linkByUser, error: userLinkError } = await supabaseClient
        .from("company_employees")
        .select("company_id, accepted_at, invited_at")
        .eq("user_id", user.id)
        .eq("status", "accepted")
        .order("accepted_at", { ascending: false, nullsFirst: false })
        .order("invited_at", { ascending: false })
        .limit(1);

      if (userLinkError) {
        throw userLinkError;
      }

      companyId = linkByUser?.[0]?.company_id ?? null;

      if (!companyId && user.email) {
        const normalizedEmail = user.email.toLowerCase();
        const { data: linkByEmail, error: emailLinkError } = await supabaseClient
          .from("company_employees")
          .select("company_id, accepted_at, invited_at")
          .eq("email", normalizedEmail)
          .eq("status", "accepted")
          .order("accepted_at", { ascending: false, nullsFirst: false })
          .order("invited_at", { ascending: false })
          .limit(1);

        if (emailLinkError) {
          throw emailLinkError;
        }

        companyId = linkByEmail?.[0]?.company_id ?? null;
      }
    }

    if (!companyId && !hasCompanyAdminRole) {
      return new Response(JSON.stringify({ error: "Not a company admin" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    if (!companyId) {
      return new Response(JSON.stringify({ error: "Company admin role has no linked company" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const now = new Date();
    const rangeEnd = now;
    const rangeStart = new Date(now);
    rangeStart.setUTCDate(rangeStart.getUTCDate() - 30);

    // Get all member user ids (accepted employees) + admin themselves.
    const { data: members, error: membersError } = await supabaseClient
      .from("company_employees")
      .select("user_id")
      .eq("company_id", companyId)
      .eq("status", "accepted")
      .not("user_id", "is", null);

    if (membersError) throw membersError;

    const memberIds = Array.from(
      new Set<string>([user.id, ...(members ?? []).map((m: any) => m.user_id).filter(Boolean)]),
    );

    // Fetch completed bookings for those members in the last 30 days.
    const { data: bookings, error: bookingsError } = await supabaseClient
      .from("bookings")
      .select("confirmed_datetime, proposed_datetime, session_duration, specialist_id, employee_user_id")
      .eq("status", "completed")
      .gte("confirmed_datetime", rangeStart.toISOString())
      .lte("confirmed_datetime", rangeEnd.toISOString())
      .in("employee_user_id", memberIds);

    if (bookingsError) throw bookingsError;

    const specialistIds = Array.from(new Set<string>((bookings ?? []).map((b: any) => b.specialist_id).filter(Boolean)));
    const { data: specialists, error: specialistsError } = await supabaseClient
      .from("specialists")
      .select("id, rate_tier")
      .in("id", specialistIds);

    if (specialistsError) throw specialistsError;

    const tierBySpecialistId = new Map<string, string | null>();
    for (const s of specialists ?? []) {
      tierBySpecialistId.set((s as any).id, (s as any).rate_tier ?? null);
    }

    const tierMultiplier = (tier: string | null | undefined) => {
      switch (tier) {
        case "advanced":
          return 1.6;
        case "expert":
          return 2.4;
        case "master":
          return 3.2;
        case "standard":
        default:
          return 1.0;
      }
    };

    const buckets = new Map<string, number>();
    for (const b of bookings ?? []) {
      const dt = b.confirmed_datetime ?? b.proposed_datetime;
      if (!dt) continue;
      const d = new Date(dt);
      const weekStart = startOfWeekUTC(d).toISOString();
      const duration = Number(b.session_duration ?? 60);
      const tier = tierBySpecialistId.get((b as any).specialist_id) ?? null;
      const minutes = Math.round(duration * tierMultiplier(tier));
      buckets.set(weekStart, (buckets.get(weekStart) ?? 0) + minutes);
    }

    // Fill missing weeks within range
    const firstWeek = startOfWeekUTC(rangeStart);
    const lastWeek = startOfWeekUTC(rangeEnd);
    const out: BreakdownRow[] = [];
    for (let w = new Date(firstWeek); w <= lastWeek; w = addWeeksUTC(w, 1)) {
      const key = w.toISOString();
      out.push({ week_start: key, minutes_used: buckets.get(key) ?? 0 });
    }

    return new Response(JSON.stringify({ range_start: rangeStart.toISOString(), range_end: rangeEnd.toISOString(), weeks: out }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("company-minutes-breakdown error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
