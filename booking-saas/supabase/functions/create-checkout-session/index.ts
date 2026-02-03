// Supabase Edge Function: create-checkout-session
// Creates a Stripe Checkout session for subscription upgrades

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SITE_URL = Deno.env.get('SITE_URL') || 'https://admin.booking.gl';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

// Stripe price IDs (replace with actual IDs from Stripe dashboard)
const PRICE_IDS = {
  starter: 'price_starter_monthly', // 149 DKK/month
  pro: 'price_pro_monthly',         // 349 DKK/month
  business: 'price_business_monthly', // 699 DKK/month
};

interface CheckoutRequest {
  business_id: string;
  tier: 'starter' | 'pro' | 'business';
  success_url?: string;
  cancel_url?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const { business_id, tier, success_url, cancel_url } = await req.json() as CheckoutRequest;

    if (!business_id || !tier) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const priceId = PRICE_IDS[tier];
    if (!priceId) {
      return new Response(JSON.stringify({ error: 'Invalid tier' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get business details
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, email, stripe_customer_id')
      .eq('id', business_id)
      .single();

    if (businessError || !business) {
      return new Response(JSON.stringify({ error: 'Business not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create or retrieve Stripe customer
    let customerId = business.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: business.email,
        name: business.name,
        metadata: {
          business_id: business.id,
        },
      });
      customerId = customer.id;

      // Save customer ID
      await supabase
        .from('businesses')
        .update({ stripe_customer_id: customerId })
        .eq('id', business.id);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: success_url || `${SITE_URL}/settings?success=true`,
      cancel_url: cancel_url || `${SITE_URL}/settings?cancelled=true`,
      metadata: {
        business_id: business.id,
      },
      subscription_data: {
        metadata: {
          business_id: business.id,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
    });

    return new Response(JSON.stringify({
      url: session.url,
      session_id: session.id,
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Create checkout session error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
