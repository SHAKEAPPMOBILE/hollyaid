import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppNotificationRequest {
  to: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-whatsapp-notification function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, message }: WhatsAppNotificationRequest = await req.json();
    console.log("Sending WhatsApp to:", to);

    if (!to || !message) {
      throw new Error("to and message are required");
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioWhatsAppNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER");

    if (!accountSid || !authToken || !twilioWhatsAppNumber) {
      console.error("Twilio credentials not configured");
      throw new Error("WhatsApp notifications not configured");
    }

    // Format the phone number for WhatsApp
    let formattedTo = to.replace(/\s+/g, '').replace(/[^+\d]/g, '');
    if (!formattedTo.startsWith('+')) {
      formattedTo = '+' + formattedTo;
    }

    // Twilio API endpoint
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    // Build form data
    const formData = new URLSearchParams();
    formData.append('To', `whatsapp:${formattedTo}`);
    formData.append('From', `whatsapp:${twilioWhatsAppNumber}`);
    formData.append('Body', message);

    // Make the API call
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const responseData = await response.json();
    console.log("Twilio response:", responseData);

    if (!response.ok) {
      // If WhatsApp fails, try SMS
      console.log("WhatsApp failed, trying SMS...");
      
      const smsFormData = new URLSearchParams();
      smsFormData.append('To', formattedTo);
      smsFormData.append('From', twilioWhatsAppNumber.replace('whatsapp:', ''));
      smsFormData.append('Body', message);

      const smsResponse = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: smsFormData.toString(),
      });

      const smsData = await smsResponse.json();
      console.log("SMS response:", smsData);

      if (!smsResponse.ok) {
        console.error("Both WhatsApp and SMS failed:", smsData);
        // Don't throw error, just log - we don't want to break the flow
        return new Response(
          JSON.stringify({ success: false, error: "Failed to send notification", details: smsData }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, type: 'sms', data: smsData }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, type: 'whatsapp', data: responseData }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-whatsapp-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
