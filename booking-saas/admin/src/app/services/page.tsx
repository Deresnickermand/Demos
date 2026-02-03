'use client';

import { useState, useEffect } from 'react';
import { createClient, getServices, getBusiness, createService, updateService, deleteService } from '@/lib/supabase';
import type { Business, Service } from '@/types';

export default function ServicesPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration_minutes: 60,
    price: '',
    currency: 'DKK',
    buffer_before: 0,
    buffer_after: 15,
    max_per_day: '',
  });
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const businessData = await getBusiness(supabase);
    if (!businessData) {
      setLoading(false);
      return;
    }

    setBusiness(businessData);
    const servicesData = await getServices(supabase, businessData.id);
    setServices(servicesData.filter(s => s.active));
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    setSaving(true);
    try {
      const serviceData = {
        name: formData.name,
        description: formData.description || null,
        duration_minutes: formData.duration_minutes,
        price: formData.price ? parseFloat(formData.price) : null,
        currency: formData.currency,
        buffer_before: formData.buffer_before,
        buffer_after: formData.buffer_after,
        max_per_day: formData.max_per_day ? parseInt(formData.max_per_day) : null,
      };

      if (editingService) {
        await updateService(supabase, editingService.id, serviceData);
      } else {
        await createService(supabase, {
          ...serviceData,
          business_id: business.id,
          display_order: services.length,
          active: true,
        });
      }

      await loadData();
      closeModal();
    } catch (error) {
      console.error('Failed to save service:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (service: Service) => {
    if (!confirm(`Er du sikker på at du vil slette "${service.name}"?`)) return;

    try {
      await deleteService(supabase, service.id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete service:', error);
    }
  };

  const openModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        description: service.description || '',
        duration_minutes: service.duration_minutes,
        price: service.price?.toString() || '',
        currency: service.currency,
        buffer_before: service.buffer_before,
        buffer_after: service.buffer_after,
        max_per_day: service.max_per_day?.toString() || '',
      });
    } else {
      setEditingService(null);
      setFormData({
        name: '',
        description: '',
        duration_minutes: 60,
        price: '',
        currency: 'DKK',
        buffer_before: 0,
        buffer_after: 15,
        max_per_day: '',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingService(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ydelser</h1>
          <p className="text-gray-600">Administrer de ydelser du tilbyder</p>
        </div>
        <button onClick={() => openModal()} className="btn btn-primary">
          Tilføj ydelse
        </button>
      </div>

      {/* Services list */}
      {services.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-500 mb-4">Du har endnu ikke tilføjet nogen ydelser</p>
          <button onClick={() => openModal()} className="btn btn-primary">
            Tilføj din første ydelse
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ydelse</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Varighed</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pris</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buffer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max/dag</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {services.map((service) => (
                <tr key={service.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium">{service.name}</p>
                    {service.description && (
                      <p className="text-sm text-gray-500 truncate max-w-xs">{service.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {service.duration_minutes} min
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {service.price ? `${service.price} ${service.currency}` : 'Gratis'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {service.buffer_before > 0 && `${service.buffer_before} min før`}
                    {service.buffer_before > 0 && service.buffer_after > 0 && ', '}
                    {service.buffer_after > 0 && `${service.buffer_after} min efter`}
                    {service.buffer_before === 0 && service.buffer_after === 0 && '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {service.max_per_day || 'Ingen grænse'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => openModal(service)}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium mr-4"
                    >
                      Rediger
                    </button>
                    <button
                      onClick={() => handleDelete(service)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Slet
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={closeModal} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
              <h2 className="text-lg font-semibold mb-4">
                {editingService ? 'Rediger ydelse' : 'Tilføj ny ydelse'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Navn *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="label">Beskrivelse</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Varighed (minutter) *</label>
                    <input
                      type="number"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                      className="input"
                      min={5}
                      step={5}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Pris</label>
                    <div className="flex">
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="input rounded-r-none"
                        min={0}
                        step={0.01}
                        placeholder="0 = gratis"
                      />
                      <select
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                        className="input rounded-l-none border-l-0 w-20"
                      >
                        <option value="DKK">DKK</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Buffer før (min)</label>
                    <input
                      type="number"
                      value={formData.buffer_before}
                      onChange={(e) => setFormData({ ...formData, buffer_before: parseInt(e.target.value) || 0 })}
                      className="input"
                      min={0}
                      step={5}
                    />
                  </div>
                  <div>
                    <label className="label">Buffer efter (min)</label>
                    <input
                      type="number"
                      value={formData.buffer_after}
                      onChange={(e) => setFormData({ ...formData, buffer_after: parseInt(e.target.value) || 0 })}
                      className="input"
                      min={0}
                      step={5}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Max bookinger per dag</label>
                  <input
                    type="number"
                    value={formData.max_per_day}
                    onChange={(e) => setFormData({ ...formData, max_per_day: e.target.value })}
                    className="input"
                    min={1}
                    placeholder="Tom = ingen grænse"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={closeModal} className="btn btn-secondary">
                    Annuller
                  </button>
                  <button type="submit" disabled={saving} className="btn btn-primary">
                    {saving ? 'Gemmer...' : editingService ? 'Gem ændringer' : 'Tilføj ydelse'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
