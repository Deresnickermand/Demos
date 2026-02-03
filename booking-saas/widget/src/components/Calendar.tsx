import { FunctionComponent } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import type { AvailableDate, Translations } from '../types';

interface CalendarProps {
  availableDates: AvailableDate[];
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
  onMonthChange: (year: number, month: number) => void;
  t: Translations;
  locale: 'da' | 'kl' | 'en';
}

const WEEKDAYS: Record<string, string[]> = {
  da: ['ma', 'ti', 'on', 'to', 'fr', 'lø', 'sø'],
  kl: ['at', 'ma', 'pi', 'si', 'ta', 'ar', 'sa'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
};

const MONTHS: Record<string, string[]> = {
  da: ['Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'December'],
  kl: ['Januari', 'Februari', 'Martsi', 'Aprili', 'Maji', 'Juni', 'Juli', 'Augustusi', 'Septemberi', 'Oktoberi', 'Novemberi', 'Decemberi'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
};

export const Calendar: FunctionComponent<CalendarProps> = ({
  availableDates,
  selectedDate,
  onSelect,
  onMonthChange,
  t,
  locale
}) => {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const availableDateSet = useMemo(() => {
    const set = new Set<string>();
    availableDates.forEach(d => set.add(d.available_date));
    return set;
  }, [availableDates]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);

    // Get the day of week for the first day (0 = Sunday, adjust for Monday start)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6;

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Previous month days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(viewYear, viewMonth, -i);
      days.push({ date, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(viewYear, viewMonth, i);
      days.push({ date, isCurrentMonth: true });
    }

    // Next month days to fill the grid
    const remaining = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(viewYear, viewMonth + 1, i);
      days.push({ date, isCurrentMonth: false });
    }

    return days;
  }, [viewMonth, viewYear]);

  const goToPrevMonth = () => {
    let newMonth = viewMonth - 1;
    let newYear = viewYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }
    setViewMonth(newMonth);
    setViewYear(newYear);
    onMonthChange(newYear, newMonth + 1);
  };

  const goToNextMonth = () => {
    let newMonth = viewMonth + 1;
    let newYear = viewYear;
    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    setViewMonth(newMonth);
    setViewYear(newYear);
    onMonthChange(newYear, newMonth + 1);
  };

  const isPrevDisabled = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const formatDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    return formatDateString(date) === formatDateString(selectedDate);
  };

  const isAvailable = (date: Date) => {
    return availableDateSet.has(formatDateString(date));
  };

  const isPast = (date: Date) => {
    const todayStr = formatDateString(today);
    const dateStr = formatDateString(date);
    return dateStr < todayStr;
  };

  return (
    <div class="bw-calendar">
      <div class="bw-calendar-header">
        <span class="bw-calendar-title">
          {MONTHS[locale][viewMonth]} {viewYear}
        </span>
        <div class="bw-calendar-nav">
          <button
            class="bw-nav-btn"
            onClick={goToPrevMonth}
            disabled={isPrevDisabled}
            aria-label="Previous month"
          >
            &#8249;
          </button>
          <button
            class="bw-nav-btn"
            onClick={goToNextMonth}
            aria-label="Next month"
          >
            &#8250;
          </button>
        </div>
      </div>

      <div class="bw-weekdays">
        {WEEKDAYS[locale].map((day) => (
          <div key={day} class="bw-weekday">{day}</div>
        ))}
      </div>

      <div class="bw-days">
        {calendarDays.map(({ date, isCurrentMonth }, idx) => {
          const available = isAvailable(date);
          const past = isPast(date);
          const disabled = !isCurrentMonth || past || !available;

          return (
            <button
              key={idx}
              class={`bw-day ${!isCurrentMonth ? 'other-month' : ''} ${available ? 'available' : ''} ${isSelected(date) ? 'selected' : ''}`}
              disabled={disabled}
              onClick={() => !disabled && onSelect(date)}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};
