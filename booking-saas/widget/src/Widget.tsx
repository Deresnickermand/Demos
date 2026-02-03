import { FunctionComponent } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import type {
  WidgetConfig,
  WidgetState,
  WidgetStep,
  Service,
  TimeSlot,
  CustomerData,
  Translations
} from './types';
import { translations } from './types';
import {
  fetchBusiness,
  fetchServices,
  fetchAvailableDates,
  fetchTimeSlots,
  createBooking
} from './api/supabase';
import { ServiceList } from './components/ServiceList';
import { Calendar } from './components/Calendar';
import { TimeSlots } from './components/TimeSlots';
import { BookingForm } from './components/BookingForm';
import { Confirmation } from './components/Confirmation';
import './styles/widget.css';

interface WidgetProps {
  config: WidgetConfig;
}

const initialState: WidgetState = {
  step: 'loading',
  business: null,
  services: [],
  selectedService: null,
  selectedDate: null,
  availableDates: [],
  timeSlots: [],
  selectedSlot: null,
  customerData: { name: '', email: '', phone: '', notes: '' },
  bookingId: null,
  error: null,
  loading: false
};

export const Widget: FunctionComponent<WidgetProps> = ({ config }) => {
  const [state, setState] = useState<WidgetState>(initialState);

  const locale = state.business?.locale || config.locale || 'da';
  const t: Translations = translations[locale];

  // Load initial data
  useEffect(() => {
    const loadBusiness = async () => {
      const business = await fetchBusiness(config.businessSlug);

      if (!business) {
        setState(prev => ({ ...prev, step: 'error', error: t.error_loading }));
        return;
      }

      const services = await fetchServices(business.id);

      setState(prev => ({
        ...prev,
        step: 'services',
        business,
        services
      }));
    };

    loadBusiness();
  }, [config.businessSlug]);

  // Update CSS variables based on theme
  useEffect(() => {
    if (config.primaryColor || state.business?.settings?.branding?.primary_color) {
      const color = config.primaryColor || state.business?.settings?.branding?.primary_color;
      document.documentElement.style.setProperty('--bw-primary', color!);
    }
  }, [config.primaryColor, state.business]);

  const handleServiceSelect = useCallback(async (service: Service) => {
    setState(prev => ({ ...prev, selectedService: service, loading: true }));

    if (!state.business) return;

    const today = new Date();
    const dates = await fetchAvailableDates(
      state.business.id,
      service.id,
      today.getFullYear(),
      today.getMonth() + 1
    );

    setState(prev => ({
      ...prev,
      step: 'calendar',
      availableDates: dates,
      loading: false
    }));
  }, [state.business]);

  const handleMonthChange = useCallback(async (year: number, month: number) => {
    if (!state.business || !state.selectedService) return;

    setState(prev => ({ ...prev, loading: true }));

    const dates = await fetchAvailableDates(
      state.business.id,
      state.selectedService.id,
      year,
      month
    );

    setState(prev => ({
      ...prev,
      availableDates: dates,
      loading: false
    }));
  }, [state.business, state.selectedService]);

  const handleDateSelect = useCallback(async (date: Date) => {
    if (!state.business || !state.selectedService) return;

    setState(prev => ({ ...prev, selectedDate: date, loading: true }));

    const slots = await fetchTimeSlots(
      state.business.id,
      state.selectedService.id,
      date
    );

    setState(prev => ({
      ...prev,
      step: 'times',
      timeSlots: slots,
      loading: false
    }));
  }, [state.business, state.selectedService]);

  const handleSlotSelect = useCallback((slot: TimeSlot) => {
    setState(prev => ({
      ...prev,
      selectedSlot: slot,
      step: 'form'
    }));
  }, []);

  const handleFormSubmit = useCallback(async (customerData: CustomerData) => {
    if (!state.business || !state.selectedService || !state.selectedSlot) return;

    setState(prev => ({ ...prev, loading: true, error: null, customerData }));

    const result = await createBooking(
      state.business.id,
      state.selectedService.id,
      state.selectedSlot.slot_time,
      customerData,
      locale
    );

    if (result.success && result.booking_id) {
      setState(prev => ({
        ...prev,
        step: 'confirmation',
        bookingId: result.booking_id,
        loading: false
      }));
    } else {
      setState(prev => ({
        ...prev,
        error: result.error_message || 'Der opstod en fejl',
        loading: false
      }));
    }
  }, [state.business, state.selectedService, state.selectedSlot, locale]);

  const handleBookAnother = useCallback(() => {
    setState({
      ...initialState,
      step: 'services',
      business: state.business,
      services: state.services
    });
  }, [state.business, state.services]);

  const handleBack = useCallback(() => {
    const stepOrder: WidgetStep[] = ['services', 'calendar', 'times', 'form'];
    const currentIndex = stepOrder.indexOf(state.step);

    if (currentIndex > 0) {
      setState(prev => ({
        ...prev,
        step: stepOrder[currentIndex - 1],
        error: null
      }));
    }
  }, [state.step]);

  const getStepIndex = (step: WidgetStep) => {
    const steps: WidgetStep[] = ['services', 'calendar', 'times', 'form'];
    return steps.indexOf(step);
  };

  const renderContent = () => {
    switch (state.step) {
      case 'loading':
        return (
          <div class="bw-loading">
            <div class="bw-spinner" />
            <span>{t.loading}</span>
          </div>
        );

      case 'error':
        return (
          <div class="bw-error">
            <div class="bw-error-icon">!</div>
            <p>{state.error || t.error_loading}</p>
            <button
              class="bw-btn bw-btn-primary"
              onClick={() => window.location.reload()}
            >
              {t.try_again}
            </button>
          </div>
        );

      case 'services':
        return (
          <ServiceList
            services={state.services}
            onSelect={handleServiceSelect}
            t={t}
          />
        );

      case 'calendar':
        return (
          <>
            <button class="bw-back" onClick={handleBack}>
              &#8249; {t.back}
            </button>
            <h3 class="bw-title">{t.select_date}</h3>
            <Calendar
              availableDates={state.availableDates}
              selectedDate={state.selectedDate}
              onSelect={handleDateSelect}
              onMonthChange={handleMonthChange}
              t={t}
              locale={locale}
            />
          </>
        );

      case 'times':
        return (
          <>
            <button class="bw-back" onClick={handleBack}>
              &#8249; {t.back}
            </button>
            <TimeSlots
              slots={state.timeSlots}
              selectedSlot={state.selectedSlot}
              onSelect={handleSlotSelect}
              t={t}
            />
          </>
        );

      case 'form':
        return state.selectedService && state.selectedDate && state.selectedSlot ? (
          <>
            <button class="bw-back" onClick={handleBack}>
              &#8249; {t.back}
            </button>
            <BookingForm
              service={state.selectedService}
              selectedDate={state.selectedDate}
              selectedSlot={state.selectedSlot}
              onSubmit={handleFormSubmit}
              isLoading={state.loading}
              error={state.error}
              t={t}
              locale={locale}
            />
          </>
        ) : null;

      case 'confirmation':
        return state.business && state.selectedService && state.selectedDate && state.selectedSlot && state.bookingId ? (
          <Confirmation
            business={state.business}
            service={state.selectedService}
            selectedDate={state.selectedDate}
            selectedSlot={state.selectedSlot}
            customer={state.customerData}
            bookingId={state.bookingId}
            onBookAnother={handleBookAnother}
            t={t}
            locale={locale}
          />
        ) : null;

      default:
        return null;
    }
  };

  return (
    <div class="booking-widget" data-theme={config.theme}>
      {state.business && state.step !== 'loading' && state.step !== 'error' && (
        <div class="bw-header">
          {state.business.settings?.branding?.logo_url && (
            <img
              class="bw-logo"
              src={state.business.settings.branding.logo_url}
              alt={state.business.name}
            />
          )}
          <div class="bw-header-text">
            <h2>{state.business.name}</h2>
            {state.business.settings?.branding?.welcome_text && (
              <p>{state.business.settings.branding.welcome_text}</p>
            )}
          </div>
        </div>
      )}

      {state.step !== 'loading' && state.step !== 'error' && state.step !== 'confirmation' && (
        <div class="bw-steps">
          {['services', 'calendar', 'times', 'form'].map((step, idx) => (
            <div
              key={step}
              class={`bw-step ${
                step === state.step ? 'active' : ''
              } ${
                getStepIndex(state.step) > idx ? 'completed' : ''
              }`}
            />
          ))}
        </div>
      )}

      <div class="bw-content">
        {renderContent()}
      </div>
    </div>
  );
};
