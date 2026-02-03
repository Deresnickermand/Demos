import { FunctionComponent } from 'preact';
import type { Service, Translations } from '../types';

interface ServiceListProps {
  services: Service[];
  onSelect: (service: Service) => void;
  t: Translations;
}

export const ServiceList: FunctionComponent<ServiceListProps> = ({ services, onSelect, t }) => {
  const formatPrice = (price: number | null, currency: string) => {
    if (price === null || price === 0) return t.free;
    return `${price.toFixed(0)} ${currency}`;
  };

  return (
    <div>
      <h3 class="bw-title">{t.select_service}</h3>
      <div class="bw-services">
        {services.map((service) => (
          <button
            key={service.id}
            class="bw-service-card"
            onClick={() => onSelect(service)}
          >
            <p class="bw-service-name">{service.name}</p>
            <div class="bw-service-meta">
              <span>{service.duration_minutes} {t.minutes}</span>
              <span class="bw-service-price">
                {formatPrice(service.price, service.currency)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
