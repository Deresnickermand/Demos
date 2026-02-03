// Supabase Edge Function: handle-booking-created
// Triggered via database webhook when a new booking is created
// Sends confirmation email and SMS

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: {
    id: string;
    business_id: string;
    customer_id: string;
    status: string;
  };
  old_record?: any;
}

serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();

    // Only handle new bookings
    if (payload.type !== 'INSERT' || payload.table !== 'bookings') {
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const bookingId = payload.record.id;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get full booking data with relations
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        business:businesses(*),
        customer:customers(*)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Booking not found: ${bookingId}`);
    }

    const business = booking.business;
    const customer = booking.customer;
    const settings = business.settings?.notifications;

    const results = {
      booking_id: bookingId,
      email_sent: false,
      sms_sent: false,
      errors: [] as string[],
    };

    // Send confirmation email
    if (settings?.email_enabled && customer.email) {
      try {
        const emailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: customer.email,
            template_type: 'confirmation',
            booking_id: bookingId,
            locale: customer.locale,
          }),
        });

        if (emailResponse.ok) {
          results.email_sent = true;
        } else {
          const errorData = await emailResponse.json();
          results.errors.push(`Email: ${errorData.error}`);
        }
      } catch (emailError) {
        results.errors.push(`Email: ${emailError.message}`);
      }
    }

    // Send confirmation SMS
    if (settings?.sms_enabled &&
        customer.phone &&
        (customer.preferred_contact === 'sms' || customer.preferred_contact === 'both')) {

      try {
        const smsResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-sms`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: customer.phone,
            template_type: 'confirmation',
            booking_id: bookingId,
            locale: customer.locale,
          }),
        });

        if (smsResponse.ok) {
          const smsData = await smsResponse.json();
          results.sms_sent = smsData.success || false;
        } else {
          const errorData = await smsResponse.json();
          results.errors.push(`SMS: ${errorData.error || errorData.reason}`);
        }
      } catch (smsError) {
        results.errors.push(`SMS: ${smsError.message}`);
      }
    }

    console.log('Booking notification results:', results);

    return new Response(JSON.stringify({
      success: true,
      ...results,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Handle booking created error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
