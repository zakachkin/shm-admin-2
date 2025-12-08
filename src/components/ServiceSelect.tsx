import React, { useState, useEffect } from 'react';
import { shm_request } from '../lib/shm_request';

interface Service {
  service_id: number;
  name: string;
  category?: string;
  cost?: number;
  period?: number;
  [key: string]: any;
}

interface ServiceSelectProps {
  /** Текущий service_id */
  value?: number | null;
  /** Callback при выборе услуги */
  onChange?: (serviceId: number | null, service: Service | null) => void;
  /** Callback при изменении состояния загрузки */
  onLoadingChange?: (loading: boolean) => void;
  /** Режим только для чтения */
  readonly?: boolean;
  /** Дополнительные CSS классы */
  className?: string;
}

/**
 * Глобальный компонент выбора услуги (простой select).
 * Загружает все услуги при монтировании.
 */
export default function ServiceSelect({
  value,
  onChange,
  onLoadingChange,
  readonly = false,
  className = '',
}: ServiceSelectProps) {
  const [items, setItems] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Загрузка всех услуг при монтировании
  useEffect(() => {
    setLoading(true);
    onLoadingChange?.(true);
    
    shm_request('/shm/v1/admin/service?limit=0')
      .then(res => {
        const data = res.data || res;
        const services = Array.isArray(data) ? data : [];
        setItems(services);
        
        // Если value не задан, выбираем первую услугу
        if ((value === null || value === undefined) && services.length > 0) {
          onChange?.(services[0].service_id, services[0]);
        }
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false);
        onLoadingChange?.(false);
      });
  }, []);

  // Уведомляем родителя об изменении состояния загрузки
  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const serviceId = e.target.value ? Number(e.target.value) : null;
    const service = items.find(s => s.service_id === serviceId) || null;
    onChange?.(serviceId, service);
  };

  const inputStyles = {
    backgroundColor: 'var(--theme-input-bg)',
    borderColor: 'var(--theme-input-border)',
    color: 'var(--theme-input-text)',
  };

  // Skeleton при загрузке
  if (loading) {
    return (
      <div 
        className={`w-full px-3 py-2 text-sm rounded border ${className}`}
        style={inputStyles}
      >
        <div className="flex items-center gap-2">
          <div 
            className="h-4 rounded animate-pulse flex-1" 
            style={{ 
              backgroundColor: 'var(--theme-input-border)',
            }} 
          />
        </div>
      </div>
    );
  }

  // Readonly режим
  if (readonly) {
    const selectedService = items.find(s => s.service_id === value);
    return (
      <input
        type="text"
        value={selectedService ? `[${selectedService.service_id}] ${selectedService.name}` : (value ? `#${value}` : '')}
        readOnly
        className={`w-full px-3 py-2 text-sm rounded border opacity-60 ${className}`}
        style={inputStyles}
      />
    );
  }

  // Select режим
  return (
    <select
      value={value ?? ''}
      onChange={handleChange}
      className={`w-full px-3 py-2 text-sm rounded border ${className}`}
      style={inputStyles}
    >
      {items.map(item => (
        <option key={item.service_id} value={item.service_id}>
          [{item.service_id}] {item.name}
        </option>
      ))}
    </select>
  );
}
