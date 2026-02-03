// Supabase Edge Function: send-email
// Sends emails via Resend API

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface EmailRequest {
  to: string;
  template_type: 'confirmation' | 'reminder' | 'cancellation' | 'change';
  booking_id: string;
  locale?: 'da' | 'en';
}

interface BookingData {
  id: string;
  start_time: string;
  end_time: string;
  cancellation_token: string;
  business: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  service: {
    name: string;
    duration_minutes: number;
    price: number;
  };
  customer: {
    name: string;
    email: string;
  };
}

const templates = {
  confirmation: {
    da: {
      subject: 'Booking bekræftet hos {{business_name}}',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1f2937; font-size: 24px;">Din tid er booket!</h1>
          <p style="color: #4b5563;">Hej {{customer_name}},</p>
          <p style="color: #4b5563;">Vi bekræfter hermed din booking hos <strong>{{business_name}}</strong>.</p>

          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px;"><strong>Ydelse:</strong> {{service_name}}</p>
            <p style="margin: 0 0 10px;"><strong>Dato:</strong> {{date}}</p>
            <p style="margin: 0 0 10px;"><strong>Tidspunkt:</strong> {{time}}</p>
            <p style="margin: 0;"><strong>Varighed:</strong> {{duration}} minutter</p>
          </div>

          <p style="color: #4b5563;">Skal du aflyse eller ændre din tid?</p>
          <a href="{{cancellation_url}}" style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Aflys booking</a>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px;">
            {{business_name}}<br>
            {{business_address}}
          </p>
        </div>
      `,
    },
    en: {
      subject: 'Booking confirmed at {{business_name}}',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1f2937; font-size: 24px;">Your booking is confirmed!</h1>
          <p style="color: #4b5563;">Hi {{customer_name}},</p>
          <p style="color: #4b5563;">We confirm your booking at <strong>{{business_name}}</strong>.</p>

          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px;"><strong>Service:</strong> {{service_name}}</p>
            <p style="margin: 0 0 10px;"><strong>Date:</strong> {{date}}</p>
            <p style="margin: 0 0 10px;"><strong>Time:</strong> {{time}}</p>
            <p style="margin: 0;"><strong>Duration:</strong> {{duration}} minutes</p>
          </div>

          <p style="color: #4b5563;">Need to cancel or change your appointment?</p>
          <a href="{{cancellation_url}}" style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Cancel booking</a>
        </div>
      `,
    },
  },
  reminder: {
    da: {
      subject: 'Husk din tid hos {{business_name}} i morgen',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1f2937; font-size: 24px;">Påmindelse om din booking</h1>
          <p style="color: #4b5563;">Hej {{customer_name}},</p>
          <p style="color: #4b5563;">Dette er en påmindelse om din tid hos <strong>{{business_name}}</strong> i morgen.</p>

          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px;"><strong>Ydelse:</strong> {{service_name}}</p>
            <p style="margin: 0 0 10px;"><strong>Dato:</strong> {{date}}</p>
            <p style="margin: 0;"><strong>Tidspunkt:</strong> {{time}}</p>
          </div>

          <p style="color: #4b5563;">Kan du ikke komme? Aflys venligst så tidligt som muligt:</p>
          <a href="{{cancellation_url}}" style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Aflys booking</a>
        </div>
      `,
    },
    en: {
      subject: 'Reminder: Your appointment at {{business_name}} tomorrow',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1f2937; font-size: 24px;">Booking Reminder</h1>
          <p style="color: #4b5563;">Hi {{customer_name}},</p>
          <p style="color: #4b5563;">This is a reminder about your appointment at <strong>{{business_name}}</strong> tomorrow.</p>

          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px;"><strong>Service:</strong> {{service_name}}</p>
            <p style="margin: 0 0 10px;"><strong>Date:</strong> {{date}}</p>
            <p style="margin: 0;"><strong>Time:</strong> {{time}}</p>
          </div>

          <p style="color: #4b5563;">Can't make it? Please cancel as early as possible:</p>
          <a href="{{cancellation_url}}" style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Cancel booking</a>
        </div>
      `,
    },
  },
  cancellation: {
    da: {
      subject: 'Din booking hos {{business_name}} er aflyst',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1f2937; font-size: 24px;">Booking aflyst</h1>
          <p style="color: #4b5563;">Hej {{customer_name}},</p>
          <p style="color: #4b5563;">Din booking hos <strong>{{business_name}}</strong> er blevet aflyst.</p>

          <div style="background: #fef2f2; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px;"><strong>Ydelse:</strong> {{service_name}}</p>
            <p style="margin: 0 0 10px;"><strong>Oprindelig dato:</strong> {{date}}</p>
            <p style="margin: 0;"><strong>Oprindeligt tidspunkt:</strong> {{time}}</p>
          </div>

          <p style="color: #4b5563;">Ønsker du at booke en ny tid?</p>
          <a href="{{booking_url}}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Book ny tid</a>
        </div>
      `,
    },
    en: {
      subject: 'Your booking at {{business_name}} has been cancelled',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1f2937; font-size: 24px;">Booking Cancelled</h1>
          <p style="color: #4b5563;">Hi {{customer_name}},</p>
          <p style="color: #4b5563;">Your booking at <strong>{{business_name}}</strong> has been cancelled.</p>

          <div style="background: #fef2f2; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px;"><strong>Service:</strong> {{service_name}}</p>
            <p style="margin: 0 0 10px;"><strong>Original date:</strong> {{date}}</p>
            <p style="margin: 0;"><strong>Original time:</strong> {{time}}</p>
          </div>

          <p style="color: #4b5563;">Would you like to book a new appointment?</p>
          <a href="{{booking_url}}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Book new time</a>
        </div>
      `,
    },
  },
  change: {
    da: {
      subject: 'Din booking hos {{business_name}} er blevet ændret',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1f2937; font-size: 24px;">Booking ændret</h1>
          <p style="color: #4b5563;">Hej {{customer_name}},</p>
          <p style="color: #4b5563;">Din booking hos <strong>{{business_name}}</strong> er blevet ændret.</p>

          <div style="background: #eff6ff; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px;"><strong>Ydelse:</strong> {{service_name}}</p>
            <p style="margin: 0 0 10px;"><strong>Ny dato:</strong> {{date}}</p>
            <p style="margin: 0;"><strong>Nyt tidspunkt:</strong> {{time}}</p>
          </div>

          <a href="{{cancellation_url}}" style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Aflys booking</a>
        </div>
      `,
    },
    en: {
      subject: 'Your booking at {{business_name}} has been changed',
      html: `<div>Booking changed</div>`,
    },
  },
};

function formatDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };
  return date.toLocaleDateString(locale === 'da' ? 'da-DK' : 'en-US', options);
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function replaceVariables(template: string, data: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

serve(async (req) => {
  try {
    const { to, template_type, booking_id, locale = 'da' } = await req.json() as EmailRequest;

    // Get booking data
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        business:businesses(*),
        service:services(*),
        customer:customers(*)
      `)
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Booking not found: ${booking_id}`);
    }

    const template = templates[template_type]?.[locale] || templates[template_type]?.da;
    if (!template) {
      throw new Error(`Template not found: ${template_type}`);
    }

    const variables = {
      business_name: booking.business.name,
      business_address: booking.business.address || '',
      customer_name: booking.customer.name,
      service_name: booking.service.name,
      date: formatDate(booking.start_time, locale),
      time: formatTime(booking.start_time),
      duration: booking.service.duration_minutes.toString(),
      cancellation_url: `https://booking.gl/cancel/${booking.cancellation_token}`,
      booking_url: `https://booking.gl/${booking.business.slug}`,
    };

    const subject = replaceVariables(template.subject, variables);
    const html = replaceVariables(template.html, variables);

    // Send via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${booking.business.name} <booking@booking.gl>`,
        to: [to],
        subject,
        html,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      throw new Error(`Resend error: ${JSON.stringify(resendData)}`);
    }

    // Log notification
    await supabase.from('notifications').insert({
      booking_id,
      type: template_type,
      channel: 'email',
      recipient: to,
      status: 'sent',
      external_id: resendData.id,
      sent_at: new Date().toISOString(),
    });

    // Update booking confirmation_sent_at if this is a confirmation
    if (template_type === 'confirmation') {
      await supabase
        .from('bookings')
        .update({ confirmation_sent_at: new Date().toISOString() })
        .eq('id', booking_id);
    }

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Send email error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
