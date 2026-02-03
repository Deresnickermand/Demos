import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Business, Service, Customer, Booking, DashboardStats, Profile } from '@/types';

// Client-side Supabase client
export function createClient() {
  return createClientComponentClient();
}

// ============================================
// Business Operations
// ============================================

export async function getBusiness(supabase: ReturnType<typeof createClient>) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('business_id')
    .single();

  if (!profile?.business_id) return null;

  const { data } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', profile.business_id)
    .single();

  return data as Business | null;
}

export async function updateBusiness(
  supabase: ReturnType<typeof createClient>,
  businessId: string,
  updates: Partial<Business>
) {
  const { data, error } = await supabase
    .from('businesses')
    .update(updates)
    .eq('id', businessId)
    .select()
    .single();

  if (error) throw error;
  return data as Business;
}

// ============================================
// Service Operations
// ============================================

export async function getServices(
  supabase: ReturnType<typeof createClient>,
  businessId: string
) {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', businessId)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return data as Service[];
}

export async function createService(
  supabase: ReturnType<typeof createClient>,
  service: Omit<Service, 'id' | 'created_at' | 'updated_at'>
) {
  const { data, error } = await supabase
    .from('services')
    .insert(service)
    .select()
    .single();

  if (error) throw error;
  return data as Service;
}

export async function updateService(
  supabase: ReturnType<typeof createClient>,
  serviceId: string,
  updates: Partial<Service>
) {
  const { data, error } = await supabase
    .from('services')
    .update(updates)
    .eq('id', serviceId)
    .select()
    .single();

  if (error) throw error;
  return data as Service;
}

export async function deleteService(
  supabase: ReturnType<typeof createClient>,
  serviceId: string
) {
  // Soft delete by setting active = false
  const { error } = await supabase
    .from('services')
    .update({ active: false })
    .eq('id', serviceId);

  if (error) throw error;
}

// ============================================
// Customer Operations
// ============================================

export async function getCustomers(
  supabase: ReturnType<typeof createClient>,
  businessId: string,
  options?: { limit?: number; offset?: number; search?: string }
) {
  let query = supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (options?.search) {
    query = query.or(`name.ilike.%${options.search}%,email.ilike.%${options.search}%,phone.ilike.%${options.search}%`);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data, error, count } = await query;

  if (error) throw error;
  return { data: data as Customer[], count };
}

export async function getCustomer(
  supabase: ReturnType<typeof createClient>,
  customerId: string
) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();

  if (error) throw error;
  return data as Customer;
}

// ============================================
// Booking Operations
// ============================================

export async function getBookings(
  supabase: ReturnType<typeof createClient>,
  businessId: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
    status?: Booking['status'];
    serviceId?: string;
    customerId?: string;
    limit?: number;
    offset?: number;
  }
) {
  let query = supabase
    .from('bookings')
    .select(`
      *,
      service:services(*),
      customer:customers(*)
    `, { count: 'exact' })
    .eq('business_id', businessId)
    .order('start_time', { ascending: true });

  if (options?.startDate) {
    query = query.gte('start_time', options.startDate.toISOString());
  }

  if (options?.endDate) {
    query = query.lte('start_time', options.endDate.toISOString());
  }

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.serviceId) {
    query = query.eq('service_id', options.serviceId);
  }

  if (options?.customerId) {
    query = query.eq('customer_id', options.customerId);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data, error, count } = await query;

  if (error) throw error;
  return { data: data as Booking[], count };
}

export async function getBooking(
  supabase: ReturnType<typeof createClient>,
  bookingId: string
) {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      service:services(*),
      customer:customers(*)
    `)
    .eq('id', bookingId)
    .single();

  if (error) throw error;
  return data as Booking;
}

export async function updateBooking(
  supabase: ReturnType<typeof createClient>,
  bookingId: string,
  updates: Partial<Booking>
) {
  const { data, error } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', bookingId)
    .select()
    .single();

  if (error) throw error;
  return data as Booking;
}

export async function createManualBooking(
  supabase: ReturnType<typeof createClient>,
  booking: {
    business_id: string;
    service_id: string;
    customer_id: string;
    start_time: string;
    end_time: string;
    notes?: string;
    internal_notes?: string;
  }
) {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      ...booking,
      status: 'confirmed',
    })
    .select()
    .single();

  if (error) throw error;
  return data as Booking;
}

// ============================================
// Dashboard Stats
// ============================================

export async function getDashboardStats(
  supabase: ReturnType<typeof createClient>,
  businessId: string
): Promise<DashboardStats> {
  const { data, error } = await supabase
    .rpc('get_dashboard_stats', { p_business_id: businessId });

  if (error) throw error;
  return data?.[0] || {
    today_bookings: 0,
    week_bookings: 0,
    month_bookings: 0,
    new_customers_week: 0,
    no_shows_month: 0,
    cancellations_month: 0,
  };
}

// ============================================
// Profile Operations
// ============================================

export async function getProfile(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) return null;
  return data as Profile;
}

export async function createBusinessAndProfile(
  supabase: ReturnType<typeof createClient>,
  businessData: {
    name: string;
    email: string;
    phone?: string;
  }
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Create business
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .insert({
      name: businessData.name,
      slug: businessData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      email: businessData.email,
      phone: businessData.phone,
    })
    .select()
    .single();

  if (businessError) throw businessError;

  // Update profile with business_id
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ business_id: business.id })
    .eq('id', user.id);

  if (profileError) throw profileError;

  return business as Business;
}
