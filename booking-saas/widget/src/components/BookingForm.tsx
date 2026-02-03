import { FunctionComponent } from 'preact';
import { useState } from 'preact/hooks';
import type { Service, TimeSlot, CustomerData, Translations } from '../types';

interface BookingFormProps {
  service: Service;
  selectedDate: Date;
  selectedSlot: TimeSlot;
  onSubmit: (data: CustomerData) => void;
  isLoading: boolean;
  error: string | null;
  t: Translations;
  locale: 'da' | 'kl' | 'en';
}

interface FormErrors {
  name?: string;
  email?: string;
}

export const BookingForm: FunctionComponent<BookingFormProps> = ({
  service,
  selectedDate,
  selectedSlot,
  onSubmit,
  isLoading,
  error,
  t,
  locale
}) => {
  const [formData, setFormData] = useState<CustomerData>({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(locale === 'kl' ? 'da-DK' : locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('da-DK', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatPrice = (price: number | null, currency: string) => {
    if (price === null || price === 0) return t.free;
    return `${price.toFixed(0)} ${currency}`;
  };

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();

    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = t.required_field;
    }

    if (!formData.email.trim()) {
      newErrors.email = t.required_field;
    } else if (!validateEmail(formData.email)) {
      newErrors.email = t.invalid_email;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onSubmit(formData);
  };

  const handleChange = (field: keyof CustomerData) => (e: Event) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    setFormData(prev => ({ ...prev, [field]: target.value }));
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div>
      <h3 class="bw-title">{t.your_details}</h3>

      {/* Booking summary */}
      <div class="bw-summary">
        <div class="bw-summary-row">
          <span class="bw-summary-label">{t.select_service}:</span>
          <span>{service.name}</span>
        </div>
        <div class="bw-summary-row">
          <span class="bw-summary-label">{t.select_date}:</span>
          <span>{formatDate(selectedDate)}</span>
        </div>
        <div class="bw-summary-row">
          <span class="bw-summary-label">{t.select_time}:</span>
          <span>{formatTime(selectedSlot.slot_time)}</span>
        </div>
        <div class="bw-summary-row">
          <span class="bw-summary-label">{t.duration}:</span>
          <span>{service.duration_minutes} {t.minutes}</span>
        </div>
        <div class="bw-summary-row">
          <span class="bw-summary-label">{t.price}:</span>
          <span>{formatPrice(service.price, service.currency)}</span>
        </div>
      </div>

      {error && (
        <div class="bw-error-text" style={{ marginBottom: '12px', padding: '8px', background: 'var(--bw-error)', color: 'white', borderRadius: '6px', textAlign: 'center' }}>
          {error}
        </div>
      )}

      <form class="bw-form" onSubmit={handleSubmit}>
        <div class="bw-field">
          <label class="bw-label" for="bw-name">{t.name} *</label>
          <input
            id="bw-name"
            type="text"
            class={`bw-input ${errors.name ? 'error' : ''}`}
            value={formData.name}
            onInput={handleChange('name')}
            disabled={isLoading}
            autoComplete="name"
          />
          {errors.name && <span class="bw-error-text">{errors.name}</span>}
        </div>

        <div class="bw-field">
          <label class="bw-label" for="bw-email">{t.email} *</label>
          <input
            id="bw-email"
            type="email"
            class={`bw-input ${errors.email ? 'error' : ''}`}
            value={formData.email}
            onInput={handleChange('email')}
            disabled={isLoading}
            autoComplete="email"
          />
          {errors.email && <span class="bw-error-text">{errors.email}</span>}
        </div>

        <div class="bw-field">
          <label class="bw-label" for="bw-phone">
            {t.phone} <span class="bw-label-hint">{t.phone_recommended}</span>
          </label>
          <input
            id="bw-phone"
            type="tel"
            class="bw-input"
            value={formData.phone}
            onInput={handleChange('phone')}
            disabled={isLoading}
            autoComplete="tel"
          />
        </div>

        <div class="bw-field">
          <label class="bw-label" for="bw-notes">{t.notes}</label>
          <textarea
            id="bw-notes"
            class="bw-input bw-textarea"
            value={formData.notes}
            onInput={handleChange('notes')}
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          class="bw-btn bw-btn-primary"
          disabled={isLoading}
        >
          {isLoading ? t.booking : t.book_now}
        </button>
      </form>
    </div>
  );
};
