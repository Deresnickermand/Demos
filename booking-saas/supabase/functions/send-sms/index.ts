// Supabase Edge Function: send-sms
// Sends SMS via 46elks API

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const ELKS_API_USER = Deno.env.get('ELKS_API_USER')!;
const ELKS_API_PASSWORD = Deno.env.get('ELKS_API_PASSWORD')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface SmsRequest {
  to: string; // E.164 format
  template_type: 'confirmation' | 'reminder' | 'cancellation';
  booking_id: string;
  locale?: 'da' | 'kl' | 'en';
}

// SMS templates (max 160 chars each)
const templates = {
  confirmation: {
    da: 'Tid booket: {{service}} d. {{date}} kl. {{time}} hos {{business}}. Afbud: {{url}}',
    kl: 'Booking: {{service}} {{date}} {{time}} {{business}}-mi. Peeruk: {{url}}',
    en: 'Booked: {{service}} on {{date}} at {{time}} at {{business}}. Cancel: {{url}}',
  },
  reminder: {
    da: 'Husk din tid hos {{business}} i morgen kl. {{time}}. Afbud: {{url}}',
    kl: 'Eqqaamajuk: {{business}}-mi aqagu {{time}}. Peeruk: {{url}}',
    en: 'Reminder: Your appointment at {{business}} tomorrow at {{time}}. Cancel: {{url}}',
  },
  cancellation: {
    da: 'Din tid hos {{business}} d. {{date}} kl. {{time}} er aflyst.',
    kl: '{{business}}-mi {{date}} {{time}} peerneqarpoq.',
    en: 'Your appointment at {{business}} on {{date}} at {{time}} has been cancelled.',
  },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function normalizePhone(phone: string): string {
  // Remove spaces and ensure E.164 format
  let normalized = phone.replace(/\s+/g, '');

  // If no country code, assume Greenland (+299)
  if (!normalized.startsWith('+')) {
    if (normalized.length === 6) {
      // Greenlandic number
      normalized = '+299' + normalized;
    } else if (normalized.length === 8) {
      // Danish number
      normalized = '+45' + normalized;
    } else {
      normalized = '+' + normalized;
    }
  }

  return normalized;
}

function shortenUrl(token: string): string {
  // Use a short domain for SMS
  return `booking.gl/c/${token.substring(0, 8)}`;
}

serve(async (req) => {
  try {
    const { to, template_type, booking_id, locale = 'da' } = await req.json() as SmsRequest;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get booking data
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

    // Check if business has SMS enabled and has SMS quota
    const business = booking.business;
    if (!business.settings?.notifications?.sms_enabled) {
      return new Response(JSON.stringify({ success: false, reason: 'SMS not enabled' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check SMS quota for non-pro plans
    if (business.subscription_tier === 'free') {
      return new Response(JSON.stringify({ success: false, reason: 'Free plan does not include SMS' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (business.subscription_tier === 'starter' && business.monthly_sms_count >= 50) {
      return new Response(JSON.stringify({ success: false, reason: 'SMS quota exceeded' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check for duplicate sends
    const { data: existingNotification } = await supabase
      .from('notifications')
      .select('id')
      .eq('booking_id', booking_id)
      .eq('type', template_type)
      .eq('channel', 'sms')
      .eq('status', 'sent')
      .single();

    if (existingNotification) {
      return new Response(JSON.stringify({ success: false, reason: 'SMS already sent' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get template
    const template = templates[template_type]?.[locale] || templates[template_type]?.da;
    if (!template) {
      throw new Error(`Template not found: ${template_type}`);
    }

    // Build message
    let message = template
      .replace('{{business}}', business.name.substring(0, 20))
      .replace('{{service}}', booking.service.name.substring(0, 15))
      .replace('{{date}}', formatDate(booking.start_time))
      .replace('{{time}}', formatTime(booking.start_time))
      .replace('{{url}}', shortenUrl(booking.cancellation_token));

    // Ensure message is under 160 chars
    if (message.length > 160) {
      message = message.substring(0, 157) + '...';
    }

    const normalizedPhone = normalizePhone(to);

    // Send via 46elks
    const auth = btoa(`${ELKS_API_USER}:${ELKS_API_PASSWORD}`);

    const elksResponse = await fetch('https://api.46elks.com/a1/sms', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        from: 'BookingGL',
        to: normalizedPhone,
        message,
      }),
    });

    const elksData = await elksResponse.json();

    if (!elksResponse.ok || elksData.status === 'failed') {
      throw new Error(`46elks error: ${JSON.stringify(elksData)}`);
    }

    // Log notification
    await supabase.from('notifications').insert({
      booking_id,
      type: template_type,
      channel: 'sms',
      recipient: normalizedPhone,
      message_content: message,
      status: 'sent',
      external_id: elksData.id,
      sent_at: new Date().toISOString(),
    });

    // Update SMS counter
    await supabase
      .from('businesses')
      .update({ monthly_sms_count: business.monthly_sms_count + 1 })
      .eq('id', business.id);

    return new Response(JSON.stringify({
      success: true,
      id: elksData.id,
      cost: elksData.cost,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Send SMS error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
