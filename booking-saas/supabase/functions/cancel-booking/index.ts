// Supabase Edge Function: cancel-booking
// Handles cancellation requests from customers via cancellation link

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Handle both GET (view booking) and POST (cancel booking)
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response(renderPage('error', { message: 'Ugyldig link' }), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Get booking details
  const { data: bookingData } = await supabase
    .rpc('get_booking_details', { p_token: token });

  const booking = bookingData?.[0];

  if (!booking) {
    return new Response(renderPage('error', { message: 'Booking ikke fundet' }), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Handle POST (cancellation request)
  if (req.method === 'POST') {
    const formData = await req.formData();
    const reason = formData.get('reason')?.toString() || null;

    const { data: result } = await supabase
      .rpc('cancel_booking_by_token', {
        p_token: token,
        p_reason: reason,
      });

    if (result?.[0]?.success) {
      // Send cancellation email
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: booking.customer_email || '',
            template_type: 'cancellation',
            booking_id: booking.booking_id,
          }),
        });
      } catch (e) {
        console.error('Failed to send cancellation email:', e);
      }

      return new Response(renderPage('cancelled', booking), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    } else {
      return new Response(renderPage('error', { message: result?.[0]?.error_message || 'Kunne ikke aflyse' }), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
  }

  // Handle GET (view booking / confirm cancellation)
  if (booking.status === 'cancelled') {
    return new Response(renderPage('already_cancelled', booking), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  return new Response(renderPage('confirm', { ...booking, token }), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('da-DK', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function renderPage(type: string, data: any): string {
  const baseStyles = `
    <style>
      * { box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #f5f5f5;
        margin: 0;
        padding: 20px;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .card {
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        padding: 32px;
        max-width: 400px;
        width: 100%;
        text-align: center;
      }
      h1 { color: #1f2937; margin: 0 0 8px; font-size: 24px; }
      p { color: #6b7280; margin: 0 0 16px; }
      .details {
        background: #f9fafb;
        border-radius: 8px;
        padding: 16px;
        margin: 24px 0;
        text-align: left;
      }
      .detail-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .detail-row:last-child { margin-bottom: 0; }
      .detail-label { color: #9ca3af; font-size: 14px; }
      .detail-value { color: #1f2937; font-weight: 500; font-size: 14px; }
      .btn {
        display: inline-block;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        text-decoration: none;
        cursor: pointer;
        border: none;
        width: 100%;
        margin-top: 8px;
      }
      .btn-danger { background: #ef4444; color: white; }
      .btn-danger:hover { background: #dc2626; }
      .btn-secondary { background: #e5e7eb; color: #374151; }
      .btn-secondary:hover { background: #d1d5db; }
      textarea {
        width: 100%;
        padding: 12px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        font-size: 14px;
        resize: vertical;
        min-height: 80px;
        margin-top: 16px;
      }
      .icon {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 16px;
        font-size: 24px;
      }
      .icon-error { background: #fef2f2; color: #ef4444; }
      .icon-success { background: #ecfdf5; color: #10b981; }
    </style>
  `;

  if (type === 'error') {
    return `
      <!DOCTYPE html>
      <html lang="da">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Fejl - Booking.gl</title>
        ${baseStyles}
      </head>
      <body>
        <div class="card">
          <div class="icon icon-error">!</div>
          <h1>Der opstod en fejl</h1>
          <p>${data.message}</p>
          <a href="https://booking.gl" class="btn btn-secondary">Gå til forsiden</a>
        </div>
      </body>
      </html>
    `;
  }

  if (type === 'already_cancelled') {
    return `
      <!DOCTYPE html>
      <html lang="da">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Allerede aflyst - Booking.gl</title>
        ${baseStyles}
      </head>
      <body>
        <div class="card">
          <div class="icon icon-error">!</div>
          <h1>Booking allerede aflyst</h1>
          <p>Denne booking er allerede blevet aflyst.</p>

          <div class="details">
            <div class="detail-row">
              <span class="detail-label">Ydelse</span>
              <span class="detail-value">${data.service_name}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Dato</span>
              <span class="detail-value">${formatDate(data.start_time)}</span>
            </div>
          </div>

          <a href="https://booking.gl" class="btn btn-secondary">Book en ny tid</a>
        </div>
      </body>
      </html>
    `;
  }

  if (type === 'cancelled') {
    return `
      <!DOCTYPE html>
      <html lang="da">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking aflyst - Booking.gl</title>
        ${baseStyles}
      </head>
      <body>
        <div class="card">
          <div class="icon icon-success">✓</div>
          <h1>Booking aflyst</h1>
          <p>Din booking er nu blevet aflyst. Du modtager en bekræftelse på email.</p>

          <div class="details">
            <div class="detail-row">
              <span class="detail-label">Virksomhed</span>
              <span class="detail-value">${data.business_name}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Ydelse</span>
              <span class="detail-value">${data.service_name}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Dato</span>
              <span class="detail-value">${formatDate(data.start_time)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Tid</span>
              <span class="detail-value">${formatTime(data.start_time)}</span>
            </div>
          </div>

          <a href="https://booking.gl" class="btn btn-secondary">Book en ny tid</a>
        </div>
      </body>
      </html>
    `;
  }

  // Confirm cancellation page
  return `
    <!DOCTYPE html>
    <html lang="da">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Aflys booking - Booking.gl</title>
      ${baseStyles}
    </head>
    <body>
      <div class="card">
        <h1>Aflys booking?</h1>
        <p>Er du sikker på at du vil aflyse din booking hos <strong>${data.business_name}</strong>?</p>

        <div class="details">
          <div class="detail-row">
            <span class="detail-label">Ydelse</span>
            <span class="detail-value">${data.service_name}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Dato</span>
            <span class="detail-value">${formatDate(data.start_time)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Tid</span>
            <span class="detail-value">${formatTime(data.start_time)} - ${formatTime(data.end_time)}</span>
          </div>
        </div>

        <form method="POST" action="?token=${data.token}">
          <textarea name="reason" placeholder="Årsag til aflysning (valgfrit)"></textarea>
          <button type="submit" class="btn btn-danger">Ja, aflys min booking</button>
          <a href="javascript:history.back()" class="btn btn-secondary">Nej, behold booking</a>
        </form>
      </div>
    </body>
    </html>
  `;
}
