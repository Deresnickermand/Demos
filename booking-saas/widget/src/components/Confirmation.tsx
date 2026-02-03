import { FunctionComponent } from 'preact';
import type { Service, TimeSlot, CustomerData, Business, Translations } from '../types';

interface ConfirmationProps {
  business: Business;
  service: Service;
  selectedDate: Date;
  selectedSlot: TimeSlot;
  customer: CustomerData;
  bookingId: string;
  onBookAnother: () => void;
  t: Translations;
  locale: 'da' | 'kl' | 'en';
}

export const Confirmation: FunctionComponent<ConfirmationProps> = ({
  business,
  service,
  selectedDate,
  selectedSlot,
  customer,
  onBookAnother,
  t,
  locale
}) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString(locale === 'kl' ? 'da-DK' : locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
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

  const generateCalendarUrl = () => {
    const startDate = new Date(selectedSlot.slot_time);
    const endDate = new Date(selectedSlot.slot_end);

    // Format for Google Calendar
    const formatGoogleDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d{3}/g, '');
    };

    const title = encodeURIComponent(`${service.name} - ${business.name}`);
    const details = encodeURIComponent(`Booking hos ${business.name}\n\nYdelse: ${service.name}\nVarighed: ${service.duration_minutes} min`);
    const location = encodeURIComponent(business.settings?.branding?.welcome_text || business.name);

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}&details=${details}&location=${location}`;
  };

  const generateIcsUrl = () => {
    const startDate = new Date(selectedSlot.slot_time);
    const endDate = new Date(selectedSlot.slot_end);

    const formatIcsDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d{3}/g, '').slice(0, -1) + 'Z';
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//booking.gl//Booking Widget//DA',
      'BEGIN:VEVENT',
      `DTSTART:${formatIcsDate(startDate)}`,
      `DTEND:${formatIcsDate(endDate)}`,
      `SUMMARY:${service.name} - ${business.name}`,
      `DESCRIPTION:Booking hos ${business.name}\\n\\nYdelse: ${service.name}\\nVarighed: ${service.duration_minutes} min`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(icsContent);
  };

  return (
    <div class="bw-confirmation">
      <div class="bw-success-icon">&#10003;</div>

      <h3>{t.confirmation_title}</h3>
      <p>{t.confirmation_message}</p>

      <div class="bw-confirmation-details">
        <div class="bw-summary-row">
          <span class="bw-summary-label">{t.name}:</span>
          <span>{customer.name}</span>
        </div>
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
          <span>{formatTime(selectedSlot.slot_time)} - {formatTime(selectedSlot.slot_end)}</span>
        </div>
      </div>

      <div class="bw-btn-row" style={{ flexDirection: 'column' }}>
        <a
          href={generateCalendarUrl()}
          target="_blank"
          rel="noopener noreferrer"
          class="bw-btn bw-btn-secondary"
          style={{ textDecoration: 'none', textAlign: 'center' }}
        >
          {t.add_to_calendar} (Google)
        </a>
        <a
          href={generateIcsUrl()}
          download={`booking-${service.name.toLowerCase().replace(/\s+/g, '-')}.ics`}
          class="bw-btn bw-btn-secondary"
          style={{ textDecoration: 'none', textAlign: 'center' }}
        >
          {t.add_to_calendar} (.ics)
        </a>
        <button
          class="bw-btn bw-btn-primary"
          onClick={onBookAnother}
        >
          {t.book_another}
        </button>
      </div>
    </div>
  );
};
