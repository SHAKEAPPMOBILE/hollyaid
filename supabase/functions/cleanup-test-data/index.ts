import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all expired test data records
    const { data: expiredRecords, error: fetchError } = await supabaseAdmin
      .from("test_account_data")
      .select("*")
      .lt("expires_at", new Date().toISOString());

    if (fetchError) {
      console.error("Error fetching expired records:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiredRecords?.length || 0} expired test records to clean up`);

    let deletedCount = 0;
    const errors: string[] = [];

    for (const record of expiredRecords || []) {
      try {
        // Delete from the appropriate table
        const { error: deleteError } = await supabaseAdmin
          .from(record.table_name)
          .delete()
          .eq("id", record.record_id);

        if (deleteError) {
          console.error(`Error deleting from ${record.table_name}:`, deleteError);
          errors.push(`${record.table_name}:${record.record_id}`);
        } else {
          // Delete the tracking record
          await supabaseAdmin
            .from("test_account_data")
            .delete()
            .eq("id", record.id);
          deletedCount++;
        }
      } catch (err) {
        console.error(`Error processing record ${record.id}:`, err);
        errors.push(`${record.table_name}:${record.record_id}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        deleted: deletedCount,
        errors: errors.length > 0 ? errors : undefined,
        message: `Cleaned up ${deletedCount} expired test records`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Cleanup error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
