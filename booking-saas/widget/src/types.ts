// ============================================
// Widget Types
// ============================================

export interface Business {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  locale: 'da' | 'kl' | 'en';
  settings: BusinessSettings;
}

export interface BusinessSettings {
  branding: {
    primary_color: string;
    logo_url: string | null;
    welcome_text: string | null;
  };
  opening_hours: OpeningHours;
  booking_rules: {
    min_notice_hours: number;
    max_advance_days: number;
    slot_duration_minutes: number;
  };
}

export interface OpeningHours {
  [day: string]: {
    open: string | null;
    close: string | null;
    breaks: { start: string; end: string }[];
  };
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  currency: string;
}

export interface TimeSlot {
  slot_time: string;
  slot_end: string;
}

export interface AvailableDate {
  available_date: string;
  slot_count: number;
}

export interface BookingResult {
  success: boolean;
  booking_id: string | null;
  error_code: string | null;
  error_message: string | null;
}

export interface CustomerData {
  name: string;
  email: string;
  phone: string;
  notes: string;
}

export type WidgetStep = 'loading' | 'services' | 'calendar' | 'times' | 'form' | 'confirmation' | 'error';

export interface WidgetState {
  step: WidgetStep;
  business: Business | null;
  services: Service[];
  selectedService: Service | null;
  selectedDate: Date | null;
  availableDates: AvailableDate[];
  timeSlots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  customerData: CustomerData;
  bookingId: string | null;
  error: string | null;
  loading: boolean;
}

export interface WidgetConfig {
  businessSlug: string;
  theme: 'light' | 'dark';
  primaryColor?: string;
  locale?: 'da' | 'kl' | 'en';
}

// Translations
export interface Translations {
  loading: string;
  error_loading: string;
  select_service: string;
  select_date: string;
  select_time: string;
  your_details: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  book_now: string;
  booking: string;
  back: string;
  morning: string;
  afternoon: string;
  duration: string;
  minutes: string;
  price: string;
  free: string;
  confirmation_title: string;
  confirmation_message: string;
  add_to_calendar: string;
  book_another: string;
  required_field: string;
  invalid_email: string;
  slot_not_available: string;
  try_again: string;
  phone_recommended: string;
}

export const translations: Record<'da' | 'kl' | 'en', Translations> = {
  da: {
    loading: 'Indlæser...',
    error_loading: 'Kunne ikke indlæse booking-widget',
    select_service: 'Vælg ydelse',
    select_date: 'Vælg dato',
    select_time: 'Vælg tid',
    your_details: 'Dine oplysninger',
    name: 'Navn',
    email: 'E-mail',
    phone: 'Telefon',
    notes: 'Bemærkninger',
    book_now: 'Book tid',
    booking: 'Booker...',
    back: 'Tilbage',
    morning: 'Formiddag',
    afternoon: 'Eftermiddag',
    duration: 'Varighed',
    minutes: 'min',
    price: 'Pris',
    free: 'Gratis',
    confirmation_title: 'Booking bekræftet!',
    confirmation_message: 'Du modtager en bekræftelse på e-mail',
    add_to_calendar: 'Tilføj til kalender',
    book_another: 'Book en tid mere',
    required_field: 'Dette felt er påkrævet',
    invalid_email: 'Indtast en gyldig e-mailadresse',
    slot_not_available: 'Tiden er desværre ikke længere ledig',
    try_again: 'Prøv igen',
    phone_recommended: '(anbefalet for SMS-påmindelse)'
  },
  kl: {
    loading: 'Atorneqarpoq...',
    error_loading: 'Booking-widget atuarneqarsinnaanngilaq',
    select_service: 'Sullissinermut toqqakkit',
    select_date: 'Ulloq toqqakkit',
    select_time: 'Piffissaq toqqakkit',
    your_details: 'Illit pillutit',
    name: 'Ateq',
    email: 'E-mail',
    phone: 'Oqarasuaat',
    notes: 'Nalunaarutit',
    book_now: 'Booking-lerit',
    booking: 'Booking-lerpoq...',
    back: 'Utimut',
    morning: 'Ullaaq',
    afternoon: 'Unnukkut',
    duration: 'Sivisuneq',
    minutes: 'min',
    price: 'Akit',
    free: 'Akiliisoqanngilaq',
    confirmation_title: 'Booking uppernarsarneqarpoq!',
    confirmation_message: 'E-mail-ikkut uppernarsaat piumaarpatit',
    add_to_calendar: 'Ullunik nalunaarsuiffimmut ilakkit',
    book_another: 'Piffissamik allam booking-lerit',
    required_field: 'Una allanngorneqartariaqarpoq',
    invalid_email: 'E-mail atuuttut allanngukkit',
    slot_not_available: 'Piffissaq taanna attorneqarsinnaanngilaq',
    try_again: 'Misileqqigit',
    phone_recommended: '(SMS-mik eqqaamanermi ilanngussaq)'
  },
  en: {
    loading: 'Loading...',
    error_loading: 'Could not load booking widget',
    select_service: 'Select service',
    select_date: 'Select date',
    select_time: 'Select time',
    your_details: 'Your details',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    notes: 'Notes',
    book_now: 'Book now',
    booking: 'Booking...',
    back: 'Back',
    morning: 'Morning',
    afternoon: 'Afternoon',
    duration: 'Duration',
    minutes: 'min',
    price: 'Price',
    free: 'Free',
    confirmation_title: 'Booking confirmed!',
    confirmation_message: 'You will receive a confirmation by email',
    add_to_calendar: 'Add to calendar',
    book_another: 'Book another time',
    required_field: 'This field is required',
    invalid_email: 'Please enter a valid email address',
    slot_not_available: 'This time slot is no longer available',
    try_again: 'Try again',
    phone_recommended: '(recommended for SMS reminder)'
  }
};
