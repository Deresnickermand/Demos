import { FunctionComponent } from 'preact';
import { useMemo } from 'preact/hooks';
import type { TimeSlot, Translations } from '../types';

interface TimeSlotsProps {
  slots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  onSelect: (slot: TimeSlot) => void;
  t: Translations;
}

export const TimeSlots: FunctionComponent<TimeSlotsProps> = ({
  slots,
  selectedSlot,
  onSelect,
  t
}) => {
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('da-DK', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const { morning, afternoon } = useMemo(() => {
    const morningSlots: TimeSlot[] = [];
    const afternoonSlots: TimeSlot[] = [];

    slots.forEach(slot => {
      const hour = new Date(slot.slot_time).getHours();
      if (hour < 12) {
        morningSlots.push(slot);
      } else {
        afternoonSlots.push(slot);
      }
    });

    return { morning: morningSlots, afternoon: afternoonSlots };
  }, [slots]);

  const isSelected = (slot: TimeSlot) => {
    return selectedSlot?.slot_time === slot.slot_time;
  };

  return (
    <div>
      <h3 class="bw-title">{t.select_time}</h3>

      {morning.length > 0 && (
        <div class="bw-time-group">
          <div class="bw-time-group-title">{t.morning}</div>
          <div class="bw-time-slots">
            {morning.map((slot) => (
              <button
                key={slot.slot_time}
                class={`bw-time-slot ${isSelected(slot) ? 'selected' : ''}`}
                onClick={() => onSelect(slot)}
              >
                {formatTime(slot.slot_time)}
              </button>
            ))}
          </div>
        </div>
      )}

      {afternoon.length > 0 && (
        <div class="bw-time-group">
          <div class="bw-time-group-title">{t.afternoon}</div>
          <div class="bw-time-slots">
            {afternoon.map((slot) => (
              <button
                key={slot.slot_time}
                class={`bw-time-slot ${isSelected(slot) ? 'selected' : ''}`}
                onClick={() => onSelect(slot)}
              >
                {formatTime(slot.slot_time)}
              </button>
            ))}
          </div>
        </div>
      )}

      {slots.length === 0 && (
        <p style={{ color: 'var(--bw-text-secondary)', textAlign: 'center' }}>
          Ingen ledige tider denne dag
        </p>
      )}
    </div>
  );
};
