// Supabase Edge Function: stripe-webhook
// Handles Stripe webhook events for subscription management

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import Stripe from 'https://esm.sh/stripe@14.10.0?target=deno';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

// Map Stripe price IDs to subscription tiers
const PRICE_TO_TIER: Record<string, 'free' | 'starter' | 'pro' | 'business'> = {
  'price_starter_monthly': 'starter',
  'price_pro_monthly': 'pro',
  'price_business_monthly': 'business',
};

serve(async (req) => {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('Missing signature', { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === 'subscription') {
          const businessId = session.metadata?.business_id;
          const customerId = session.customer as string;
          const subscriptionId = session.subscription as string;

          if (businessId) {
            // Get subscription details
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const priceId = subscription.items.data[0]?.price.id;
            const tier = PRICE_TO_TIER[priceId] || 'starter';

            // Update business
            await supabase
              .from('businesses')
              .update({
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId,
                subscription_tier: tier,
              })
              .eq('id', businessId);

            console.log(`Business ${businessId} upgraded to ${tier}`);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price.id;
        const tier = PRICE_TO_TIER[priceId] || 'starter';
        const status = subscription.status;

        // Find business by customer ID
        const { data: business } = await supabase
          .from('businesses')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (business) {
          if (status === 'active') {
            await supabase
              .from('businesses')
              .update({ subscription_tier: tier })
              .eq('id', business.id);

            console.log(`Business ${business.id} subscription updated to ${tier}`);
          } else if (status === 'past_due' || status === 'unpaid') {
            // Could send a notification to the business owner
            console.log(`Business ${business.id} subscription status: ${status}`);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Downgrade to free
        const { data: business } = await supabase
          .from('businesses')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (business) {
          await supabase
            .from('businesses')
            .update({
              subscription_tier: 'free',
              stripe_subscription_id: null,
            })
            .eq('id', business.id);

          console.log(`Business ${business.id} downgraded to free`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Find business and log/notify
        const { data: business } = await supabase
          .from('businesses')
          .select('id, email')
          .eq('stripe_customer_id', customerId)
          .single();

        if (business) {
          console.log(`Payment failed for business ${business.id}`);
          // Could send an email notification here
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
