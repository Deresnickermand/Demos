'use client';

import { useState, useEffect } from 'react';
import { createClient, getBusiness, updateBusiness, createBusinessAndProfile } from '@/lib/supabase';
import type { Business, BusinessSettings } from '@/types';

const DAYS = [
  { key: 'monday', label: 'Mandag' },
  { key: 'tuesday', label: 'Tirsdag' },
  { key: 'wednesday', label: 'Onsdag' },
  { key: 'thursday', label: 'Torsdag' },
  { key: 'friday', label: 'Fredag' },
  { key: 'saturday', label: 'Lørdag' },
  { key: 'sunday', label: 'Søndag' },
];

export default function SettingsPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [copied, setCopied] = useState(false);

  // Form states
  const [generalForm, setGeneralForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  const [brandingForm, setBrandingForm] = useState({
    primary_color: '#2563eb',
    welcome_text: '',
  });

  const [bookingRulesForm, setBookingRulesForm] = useState({
    min_notice_hours: 2,
    max_advance_days: 30,
    slot_duration_minutes: 30,
  });

  const [notificationsForm, setNotificationsForm] = useState({
    email_enabled: true,
    sms_enabled: false,
    reminder_hours_before: 24,
  });

  const [openingHours, setOpeningHours] = useState<BusinessSettings['opening_hours']>({});

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const businessData = await getBusiness(supabase);

    if (businessData) {
      setBusiness(businessData);
      setGeneralForm({
        name: businessData.name,
        email: businessData.email,
        phone: businessData.phone || '',
        address: businessData.address || '',
      });
      setBrandingForm({
        primary_color: businessData.settings.branding.primary_color,
        welcome_text: businessData.settings.branding.welcome_text || '',
      });
      setBookingRulesForm(businessData.settings.booking_rules);
      setNotificationsForm(businessData.settings.notifications);
      setOpeningHours(businessData.settings.opening_hours);
    }

    setLoading(false);
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await createBusinessAndProfile(supabase, {
        name: generalForm.name,
        email: generalForm.email,
        phone: generalForm.phone || undefined,
      });
      await loadData();
    } catch (error) {
      console.error('Failed to create business:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGeneral = async () => {
    if (!business) return;
    setSaving(true);

    try {
      await updateBusiness(supabase, business.id, {
        name: generalForm.name,
        email: generalForm.email,
        phone: generalForm.phone || null,
        address: generalForm.address || null,
      });
      await loadData();
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBranding = async () => {
    if (!business) return;
    setSaving(true);

    try {
      await updateBusiness(supabase, business.id, {
        settings: {
          ...business.settings,
          branding: {
            ...business.settings.branding,
            primary_color: brandingForm.primary_color,
            welcome_text: brandingForm.welcome_text || null,
          },
        },
      });
      await loadData();
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBookingRules = async () => {
    if (!business) return;
    setSaving(true);

    try {
      await updateBusiness(supabase, business.id, {
        settings: {
          ...business.settings,
          booking_rules: bookingRulesForm,
        },
      });
      await loadData();
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!business) return;
    setSaving(true);

    try {
      await updateBusiness(supabase, business.id, {
        settings: {
          ...business.settings,
          notifications: notificationsForm,
        },
      });
      await loadData();
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOpeningHours = async () => {
    if (!business) return;
    setSaving(true);

    try {
      await updateBusiness(supabase, business.id, {
        settings: {
          ...business.settings,
          opening_hours: openingHours,
        },
      });
      await loadData();
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateDayHours = (day: string, field: 'open' | 'close', value: string | null) => {
    setOpeningHours({
      ...openingHours,
      [day]: {
        ...openingHours[day],
        [field]: value,
      },
    });
  };

  const copyEmbedCode = () => {
    if (!business) return;
    const code = `<script src="https://booking.gl/widget.js" data-business="${business.slug}"></script>`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // No business - show create form
  if (!business) {
    return (
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Opret din virksomhed</h1>
        <div className="card p-6">
          <form onSubmit={handleCreateBusiness} className="space-y-4">
            <div>
              <label className="label">Virksomhedsnavn *</label>
              <input
                type="text"
                value={generalForm.name}
                onChange={(e) => setGeneralForm({ ...generalForm, name: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Email *</label>
              <input
                type="email"
                value={generalForm.email}
                onChange={(e) => setGeneralForm({ ...generalForm, email: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Telefon</label>
              <input
                type="tel"
                value={generalForm.phone}
                onChange={(e) => setGeneralForm({ ...generalForm, phone: e.target.value })}
                className="input"
              />
            </div>
            <button type="submit" disabled={saving} className="btn btn-primary w-full">
              {saving ? 'Opretter...' : 'Opret virksomhed'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'Generelt' },
    { id: 'hours', label: 'Åbningstider' },
    { id: 'booking', label: 'Booking regler' },
    { id: 'notifications', label: 'Notifikationer' },
    { id: 'branding', label: 'Branding' },
    { id: 'embed', label: 'Widget embed' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Indstillinger</h1>

      <div className="flex gap-8">
        {/* Sidebar */}
        <div className="w-48 shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="card p-6">
            {activeTab === 'general' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold mb-4">Generelle oplysninger</h2>
                <div>
                  <label className="label">Virksomhedsnavn</label>
                  <input
                    type="text"
                    value={generalForm.name}
                    onChange={(e) => setGeneralForm({ ...generalForm, name: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={generalForm.email}
                    onChange={(e) => setGeneralForm({ ...generalForm, email: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Telefon</label>
                  <input
                    type="tel"
                    value={generalForm.phone}
                    onChange={(e) => setGeneralForm({ ...generalForm, phone: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Adresse</label>
                  <textarea
                    value={generalForm.address}
                    onChange={(e) => setGeneralForm({ ...generalForm, address: e.target.value })}
                    className="input"
                    rows={2}
                  />
                </div>
                <button onClick={handleSaveGeneral} disabled={saving} className="btn btn-primary">
                  {saving ? 'Gemmer...' : 'Gem ændringer'}
                </button>
              </div>
            )}

            {activeTab === 'hours' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold mb-4">Åbningstider</h2>
                {DAYS.map((day) => (
                  <div key={day.key} className="flex items-center gap-4">
                    <span className="w-24 text-sm font-medium">{day.label}</span>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={openingHours[day.key]?.open !== null}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateDayHours(day.key, 'open', '09:00');
                            updateDayHours(day.key, 'close', '17:00');
                          } else {
                            updateDayHours(day.key, 'open', null);
                            updateDayHours(day.key, 'close', null);
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-600">Åben</span>
                    </label>
                    {openingHours[day.key]?.open !== null && (
                      <>
                        <input
                          type="time"
                          value={openingHours[day.key]?.open || '09:00'}
                          onChange={(e) => updateDayHours(day.key, 'open', e.target.value)}
                          className="input w-auto"
                        />
                        <span>-</span>
                        <input
                          type="time"
                          value={openingHours[day.key]?.close || '17:00'}
                          onChange={(e) => updateDayHours(day.key, 'close', e.target.value)}
                          className="input w-auto"
                        />
                      </>
                    )}
                  </div>
                ))}
                <button onClick={handleSaveOpeningHours} disabled={saving} className="btn btn-primary mt-4">
                  {saving ? 'Gemmer...' : 'Gem ændringer'}
                </button>
              </div>
            )}

            {activeTab === 'booking' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold mb-4">Booking regler</h2>
                <div>
                  <label className="label">Minimum varsel (timer)</label>
                  <input
                    type="number"
                    value={bookingRulesForm.min_notice_hours}
                    onChange={(e) => setBookingRulesForm({ ...bookingRulesForm, min_notice_hours: parseInt(e.target.value) || 0 })}
                    className="input w-32"
                    min={0}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Kunder kan ikke booke med kortere varsel end dette
                  </p>
                </div>
                <div>
                  <label className="label">Maksimum fremtid (dage)</label>
                  <input
                    type="number"
                    value={bookingRulesForm.max_advance_days}
                    onChange={(e) => setBookingRulesForm({ ...bookingRulesForm, max_advance_days: parseInt(e.target.value) || 1 })}
                    className="input w-32"
                    min={1}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Hvor langt frem kunder kan booke
                  </p>
                </div>
                <div>
                  <label className="label">Tid mellem slots (minutter)</label>
                  <select
                    value={bookingRulesForm.slot_duration_minutes}
                    onChange={(e) => setBookingRulesForm({ ...bookingRulesForm, slot_duration_minutes: parseInt(e.target.value) })}
                    className="input w-32"
                  >
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={60}>60 min</option>
                  </select>
                </div>
                <button onClick={handleSaveBookingRules} disabled={saving} className="btn btn-primary">
                  {saving ? 'Gemmer...' : 'Gem ændringer'}
                </button>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold mb-4">Notifikationer</h2>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">Email notifikationer</p>
                    <p className="text-sm text-gray-500">Send bekræftelser og påmindelser via email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationsForm.email_enabled}
                      onChange={(e) => setNotificationsForm({ ...notificationsForm, email_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">SMS notifikationer</p>
                    <p className="text-sm text-gray-500">Send påmindelser via SMS (ekstra betaling)</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationsForm.sms_enabled}
                      onChange={(e) => setNotificationsForm({ ...notificationsForm, sms_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
                <div>
                  <label className="label">Send påmindelse (timer før)</label>
                  <select
                    value={notificationsForm.reminder_hours_before}
                    onChange={(e) => setNotificationsForm({ ...notificationsForm, reminder_hours_before: parseInt(e.target.value) })}
                    className="input w-32"
                  >
                    <option value={2}>2 timer</option>
                    <option value={12}>12 timer</option>
                    <option value={24}>24 timer</option>
                    <option value={48}>48 timer</option>
                  </select>
                </div>
                <button onClick={handleSaveNotifications} disabled={saving} className="btn btn-primary">
                  {saving ? 'Gemmer...' : 'Gem ændringer'}
                </button>
              </div>
            )}

            {activeTab === 'branding' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold mb-4">Branding</h2>
                <div>
                  <label className="label">Primær farve</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={brandingForm.primary_color}
                      onChange={(e) => setBrandingForm({ ...brandingForm, primary_color: e.target.value })}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={brandingForm.primary_color}
                      onChange={(e) => setBrandingForm({ ...brandingForm, primary_color: e.target.value })}
                      className="input w-32"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Velkomsttekst</label>
                  <textarea
                    value={brandingForm.welcome_text}
                    onChange={(e) => setBrandingForm({ ...brandingForm, welcome_text: e.target.value })}
                    className="input"
                    rows={2}
                    placeholder="Vises i toppen af booking widget"
                  />
                </div>
                <button onClick={handleSaveBranding} disabled={saving} className="btn btn-primary">
                  {saving ? 'Gemmer...' : 'Gem ændringer'}
                </button>
              </div>
            )}

            {activeTab === 'embed' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold mb-4">Widget embed kode</h2>
                <p className="text-gray-600">
                  Kopier koden nedenfor og indsæt den på din hjemmeside, hvor du ønsker booking-widgetten skal vises.
                </p>

                <div className="relative">
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                    <code>{`<script src="https://booking.gl/widget.js" data-business="${business.slug}"></script>`}</code>
                  </pre>
                  <button
                    onClick={copyEmbedCode}
                    className="absolute top-2 right-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
                  >
                    {copied ? 'Kopieret!' : 'Kopier'}
                  </button>
                </div>

                <div className="mt-6">
                  <h3 className="font-medium mb-2">Tilpasning</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Du kan tilpasse widgetten med følgende data-attributter:
                  </p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Attribut</th>
                        <th className="text-left py-2">Beskrivelse</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 font-mono text-xs">data-theme="dark"</td>
                        <td className="py-2">Skift til mørkt tema</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 font-mono text-xs">data-primary-color="#ff0000"</td>
                        <td className="py-2">Tilpas primær farve</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 font-mono text-xs">data-locale="en"</td>
                        <td className="py-2">Skift sprog (da, en)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 p-4 bg-primary-50 rounded-lg">
                  <p className="text-sm text-primary-800">
                    <strong>Din widget URL:</strong>{' '}
                    <a
                      href={`https://booking.gl/${business.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      booking.gl/{business.slug}
                    </a>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
