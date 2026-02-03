// Supabase Edge Function: process-reminders
// Cron job that runs every hour to send booking reminders
// Schedule: 0 * * * * (every hour)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get bookings needing reminders (24 hours before)
    const { data: bookings, error } = await supabase
      .rpc('get_bookings_needing_reminder');

    if (error) {
      throw error;
    }

    console.log(`Found ${bookings?.length || 0} bookings needing reminders`);

    const results = {
      processed: 0,
      emails_sent: 0,
      sms_sent: 0,
      errors: [] as string[],
    };

    for (const booking of bookings || []) {
      try {
        const settings = booking.business_settings?.notifications;

        // Send email if enabled
        if (settings?.email_enabled && booking.customer_email) {
          const emailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: booking.customer_email,
              template_type: 'reminder',
              booking_id: booking.booking_id,
              locale: booking.customer_locale,
            }),
          });

          if (emailResponse.ok) {
            results.emails_sent++;
          } else {
            const errorData = await emailResponse.json();
            results.errors.push(`Email failed for ${booking.booking_id}: ${errorData.error}`);
          }
        }

        // Send SMS if enabled and customer prefers it
        if (settings?.sms_enabled &&
            booking.customer_phone &&
            (booking.customer_preferred_contact === 'sms' || booking.customer_preferred_contact === 'both')) {

          const smsResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-sms`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: booking.customer_phone,
              template_type: 'reminder',
              booking_id: booking.booking_id,
              locale: booking.customer_locale,
            }),
          });

          if (smsResponse.ok) {
            const smsData = await smsResponse.json();
            if (smsData.success) {
              results.sms_sent++;
            }
          } else {
            const errorData = await smsResponse.json();
            results.errors.push(`SMS failed for ${booking.booking_id}: ${errorData.error}`);
          }
        }

        // Mark reminder as sent
        await supabase.rpc('mark_reminder_sent', { p_booking_id: booking.booking_id });

        results.processed++;
      } catch (bookingError) {
        console.error(`Error processing booking ${booking.booking_id}:`, bookingError);
        results.errors.push(`Booking ${booking.booking_id}: ${bookingError.message}`);
      }
    }

    console.log('Reminder processing complete:', results);

    return new Response(JSON.stringify({
      success: true,
      ...results,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Process reminders error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
