import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Business, Service, TimeSlot, AvailableDate, BookingResult, CustomerData } from '../types';

// These will be set from environment or config
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

let supabase: SupabaseClient;

export function initSupabase(url?: string, key?: string) {
  supabase = createClient(url || SUPABASE_URL, key || SUPABASE_ANON_KEY);
  return supabase;
}

export function getSupabase() {
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabase;
}

export async function fetchBusiness(slug: string): Promise<Business | null> {
  const { data, error } = await getSupabase()
    .rpc('get_business_by_slug', { p_slug: slug });

  if (error) {
    console.error('Error fetching business:', error);
    return null;
  }

  return data?.[0] || null;
}

export async function fetchServices(businessId: string): Promise<Service[]> {
  const { data, error } = await getSupabase()
    .rpc('get_services_by_business', { p_business_id: businessId });

  if (error) {
    console.error('Error fetching services:', error);
    return [];
  }

  return data || [];
}

export async function fetchAvailableDates(
  businessId: string,
  serviceId: string,
  year: number,
  month: number
): Promise<AvailableDate[]> {
  const { data, error } = await getSupabase()
    .rpc('get_available_dates', {
      p_business_id: businessId,
      p_service_id: serviceId,
      p_year: year,
      p_month: month
    });

  if (error) {
    console.error('Error fetching available dates:', error);
    return [];
  }

  return data || [];
}

export async function fetchTimeSlots(
  businessId: string,
  serviceId: string,
  date: Date
): Promise<TimeSlot[]> {
  const dateStr = date.toISOString().split('T')[0];

  const { data, error } = await getSupabase()
    .rpc('get_available_slots', {
      p_business_id: businessId,
      p_service_id: serviceId,
      p_date: dateStr
    });

  if (error) {
    console.error('Error fetching time slots:', error);
    return [];
  }

  return data || [];
}

export async function createBooking(
  businessId: string,
  serviceId: string,
  startTime: string,
  customer: CustomerData,
  locale: 'da' | 'kl' | 'en' = 'da'
): Promise<BookingResult> {
  const { data, error } = await getSupabase()
    .rpc('create_booking', {
      p_business_id: businessId,
      p_service_id: serviceId,
      p_start_time: startTime,
      p_customer_name: customer.name,
      p_customer_email: customer.email,
      p_customer_phone: customer.phone || null,
      p_notes: customer.notes || null,
      p_locale: locale
    });

  if (error) {
    console.error('Error creating booking:', error);
    return {
      success: false,
      booking_id: null,
      error_code: 'NETWORK_ERROR',
      error_message: 'Kunne ikke oprette forbindelse. Prøv igen.'
    };
  }

  return data?.[0] || {
    success: false,
    booking_id: null,
    error_code: 'UNKNOWN_ERROR',
    error_message: 'Der opstod en fejl. Prøv igen.'
  };
}
