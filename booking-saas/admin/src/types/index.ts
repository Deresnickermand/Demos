// ============================================
// Admin Dashboard Types
// ============================================

export interface Business {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  address: string | null;
  timezone: string;
  locale: 'da' | 'kl' | 'en';
  settings: BusinessSettings;
  subscription_tier: 'free' | 'starter' | 'pro' | 'business';
  stripe_customer_id: string | null;
  monthly_booking_count: number;
  monthly_sms_count: number;
  created_at: string;
  updated_at: string;
}

export interface BusinessSettings {
  branding: {
    primary_color: string;
    logo_url: string | null;
    welcome_text: string | null;
  };
  booking_rules: {
    min_notice_hours: number;
    max_advance_days: number;
    slot_duration_minutes: number;
  };
  notifications: {
    email_enabled: boolean;
    sms_enabled: boolean;
    reminder_hours_before: number;
  };
  opening_hours: {
    [day: string]: {
      open: string | null;
      close: string | null;
      breaks: { start: string; end: string }[];
    };
  };
}

export interface Service {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  currency: string;
  buffer_before: number;
  buffer_after: number;
  max_per_day: number | null;
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  preferred_contact: 'email' | 'sms' | 'both';
  locale: 'da' | 'kl' | 'en';
  notes: string | null;
  total_bookings: number;
  no_shows: number;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  business_id: string;
  service_id: string;
  customer_id: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  notes: string | null;
  internal_notes: string | null;
  cancellation_token: string;
  reminder_sent_at: string | null;
  confirmation_sent_at: string | null;
  cancelled_at: string | null;
  cancelled_by: 'customer' | 'business' | 'system' | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  service?: Service;
  customer?: Customer;
}

export interface DashboardStats {
  today_bookings: number;
  week_bookings: number;
  month_bookings: number;
  new_customers_week: number;
  no_shows_month: number;
  cancellations_month: number;
}

export interface Profile {
  id: string;
  business_id: string | null;
  full_name: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

// Subscription limits
export const SUBSCRIPTION_LIMITS = {
  free: { bookings: 25, sms: 0 },
  starter: { bookings: 100, sms: 50 },
  pro: { bookings: Infinity, sms: Infinity },
  business: { bookings: Infinity, sms: Infinity },
} as const;
