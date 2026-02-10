import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

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

// Generate ICS calendar file content
function generateICSContent(options: {
  startDate: Date;
  endDate: Date;
  summary: string;
  description: string;
  location: string;
  organizerEmail: string;
  organizerName: string;
  attendeeEmail: string;
  attendeeName: string;
  uid: string;
}): string {
  const formatICSDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const escapeICSText = (text: string): string => {
    return text.replace(/[\\;,\n]/g, (match) => {
      if (match === '\n') return '\\n';
      return '\\' + match;
    });
  };

  const now = new Date();
  
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//HollyAid//Booking System//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${options.uid}
DTSTAMP:${formatICSDate(now)}
DTSTART:${formatICSDate(options.startDate)}
DTEND:${formatICSDate(options.endDate)}
SUMMARY:${escapeICSText(options.summary)}
DESCRIPTION:${escapeICSText(options.description)}
LOCATION:${escapeICSText(options.location)}
ORGANIZER;CN=${escapeICSText(options.organizerName)}:mailto:${options.organizerEmail}
ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=FALSE;CN=${escapeICSText(options.attendeeName)}:mailto:${options.attendeeEmail}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Reminder: ${escapeICSText(options.summary)}
END:VALARM
END:VEVENT
END:VCALENDAR`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

  try {
    const { bookingId } = await req.json();
    if (!bookingId) throw new Error("Booking ID is required");

    console.log(`Processing booking confirmation for ${bookingId}`);

    // Get booking details with related data
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select(`
        id,
        status,
        confirmed_datetime,
        meeting_link,
        notes,
        employee_user_id,
        specialist_id
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found");
    }

    // Get employee details with phone number
    const { data: employee } = await supabaseClient
      .from('profiles')
      .select('email, full_name, phone_number')
      .eq('user_id', booking.employee_user_id)
      .single();

    // Get specialist details
    const { data: specialist } = await supabaseClient
      .from('specialists')
      .select('email, full_name, specialty')
      .eq('id', booking.specialist_id)
      .single();

    if (!employee || !specialist) {
      throw new Error("Could not find employee or specialist details");
    }

    const meetingDate = booking.confirmed_datetime 
      ? new Date(booking.confirmed_datetime).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'TBD';
    
    const meetingTime = booking.confirmed_datetime
      ? new Date(booking.confirmed_datetime).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        })
      : 'TBD';

    // Construct proper JaaS meeting URL from room ID
    const jaasApiKeyId = Deno.env.get("JAAS_API_KEY_ID");
    let fullMeetingUrl = booking.meeting_link || '';
    if (booking.meeting_link && jaasApiKeyId) {
      const appId = jaasApiKeyId.split('/')[0];
      fullMeetingUrl = `https://8x8.vc/${appId}/${booking.meeting_link}`;
    }

    // Generate calendar invite if we have a confirmed datetime
    let calendarAttachment = null;
    if (booking.confirmed_datetime) {
      const startDate = new Date(booking.confirmed_datetime);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour session
      
      const icsContent = generateICSContent({
        startDate,
        endDate,
        summary: `HollyAid Session: ${specialist.specialty || 'Wellness Consultation'}`,
        description: `Wellness session with ${specialist.full_name}\\n\\nMeeting Link: ${fullMeetingUrl || 'To be provided'}\\n\\n${booking.notes ? `Notes: ${booking.notes}` : ''}`,
        location: fullMeetingUrl || 'Online (link to be provided)',
        organizerEmail: 'bookings@hollyaid.com',
        organizerName: 'HollyAid',
        attendeeEmail: employee.email,
        attendeeName: employee.full_name || 'Employee',
        uid: `booking-${bookingId}@hollyaid.com`,
      });

      // Convert to base64 for email attachment
      calendarAttachment = {
        filename: 'hollyaid-session.ics',
        content: btoa(icsContent),
      };

      console.log('Calendar invite generated successfully');
    }

    const emailTemplate = (recipientName: string, recipientRole: string) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Booking Confirmed!</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
          <p style="font-size: 18px; margin-top: 0;">Hello ${recipientName},</p>
          <p>Your ${recipientRole === 'employee' ? 'session' : 'appointment'} has been confirmed!</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <p style="margin: 0 0 10px 0;"><strong>📅 Date:</strong> ${meetingDate}</p>
            <p style="margin: 0 0 10px 0;"><strong>🕐 Time:</strong> ${meetingTime}</p>
            <p style="margin: 0 0 10px 0;"><strong>👤 ${recipientRole === 'employee' ? 'Specialist' : 'With'}:</strong> ${recipientRole === 'employee' ? specialist.full_name : employee.full_name || employee.email}</p>
            ${specialist.specialty ? `<p style="margin: 0;"><strong>📋 Specialty:</strong> ${specialist.specialty}</p>` : ''}
          </div>

          ${fullMeetingUrl ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${fullMeetingUrl}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Join Meeting</a>
          </div>
          <p style="color: #666; font-size: 14px; text-align: center;">Or copy this link: <a href="${fullMeetingUrl}" style="color: #10b981;">${fullMeetingUrl}</a></p>
          ` : ''}

          ${calendarAttachment ? `
          <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; color: #059669; font-weight: 500;">📆 A calendar invite is attached to this email. Add it to your calendar to get a reminder!</p>
          </div>
          ` : ''}

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #666; font-size: 14px; margin-bottom: 0;">Best regards,<br>The HollyAid Team</p>
        </div>
      </body>
      </html>
    `;

    // Prepare email options with optional calendar attachment
    const emailOptions = (to: string, subject: string, html: string) => {
      const options: any = {
        from: "HollyAid <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      };

      if (calendarAttachment) {
        options.attachments = [{
          filename: calendarAttachment.filename,
          content: calendarAttachment.content,
          type: 'text/calendar',
        }];
      }

      return options;
    };

    // Send email to employee
    const employeeEmail = await resend.emails.send(
      emailOptions(
        employee.email,
        "Your Booking is Confirmed! 🎉",
        emailTemplate(employee.full_name || 'there', 'employee')
      )
    );

    console.log("Employee email sent:", employeeEmail);

    // Send email to specialist
    const specialistEmail = await resend.emails.send(
      emailOptions(
        specialist.email,
        "New Appointment Confirmed",
        emailTemplate(specialist.full_name, 'specialist')
      )
    );

    console.log("Specialist email sent:", specialistEmail);

    // Send WhatsApp to employee
    if (employee.phone_number) {
      const whatsappMessage = `🎉 Booking Confirmed!\n\nHi ${employee.full_name || 'there'}, your session with ${specialist.full_name} is confirmed!\n\n📅 ${meetingDate}\n🕐 ${meetingTime}\n\n${fullMeetingUrl ? `👉 Join: ${fullMeetingUrl}` : '👉 Login for details: https://hollyaid.com/auth'}`;
      await sendWhatsAppNotification(employee.phone_number, whatsappMessage);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Confirmation emails with calendar invites sent successfully",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Send booking confirmation error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
