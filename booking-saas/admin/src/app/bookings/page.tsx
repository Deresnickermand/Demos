'use client';

import { useState, useEffect } from 'react';
import { createClient, getBookings, getBusiness, getServices, updateBooking } from '@/lib/supabase';
import type { Business, Booking, Service } from '@/types';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, startOfDay, addDays, isSameDay } from 'date-fns';
import { da } from 'date-fns/locale';

function BookingStatusBadge({ status }: { status: Booking['status'] }) {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    completed: 'bg-gray-100 text-gray-800',
    no_show: 'bg-orange-100 text-orange-800',
  };

  const labels = {
    pending: 'Afventer',
    confirmed: 'Bekræftet',
    cancelled: 'Aflyst',
    completed: 'Gennemført',
    no_show: 'Udeblevet',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}

export default function BookingsPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterService, setFilterService] = useState<string>('all');
  const supabase = createClient();

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

  useEffect(() => {
    loadData();
  }, [currentWeek, filterStatus, filterService]);

  const loadData = async () => {
    setLoading(true);
    const businessData = await getBusiness(supabase);
    if (!businessData) {
      setLoading(false);
      return;
    }

    setBusiness(businessData);

    const [servicesData, bookingsData] = await Promise.all([
      getServices(supabase, businessData.id),
      getBookings(supabase, businessData.id, {
        startDate: weekStart,
        endDate: weekEnd,
        status: filterStatus !== 'all' ? filterStatus as Booking['status'] : undefined,
        serviceId: filterService !== 'all' ? filterService : undefined,
      }),
    ]);

    setServices(servicesData);
    setBookings(bookingsData.data);
    setLoading(false);
  };

  const handleStatusChange = async (bookingId: string, newStatus: Booking['status']) => {
    try {
      await updateBooking(supabase, bookingId, {
        status: newStatus,
        ...(newStatus === 'cancelled' && { cancelled_at: new Date().toISOString(), cancelled_by: 'business' }),
      });
      await loadData();
      setSelectedBooking(null);
    } catch (error) {
      console.error('Failed to update booking:', error);
    }
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getBookingsForDay = (date: Date) => {
    return bookings.filter(b => isSameDay(new Date(b.start_time), date));
  };

  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 - 19:00

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookinger</h1>
          <p className="text-gray-600">Administrer dine bookinger</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 text-sm ${viewMode === 'calendar' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              Kalender
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 text-sm ${viewMode === 'list' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              Liste
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="font-medium min-w-[200px] text-center">
              {format(weekStart, 'd. MMM', { locale: da })} - {format(weekEnd, 'd. MMM yyyy', { locale: da })}
            </span>
            <button
              onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={() => setCurrentWeek(new Date())}
              className="btn btn-secondary ml-2"
            >
              I dag
            </button>
          </div>

          <div className="flex-1" />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input w-auto"
          >
            <option value="all">Alle statusser</option>
            <option value="pending">Afventer</option>
            <option value="confirmed">Bekræftet</option>
            <option value="cancelled">Aflyst</option>
            <option value="completed">Gennemført</option>
          </select>

          <select
            value={filterService}
            onChange={(e) => setFilterService(e.target.value)}
            className="input w-auto"
          >
            <option value="all">Alle ydelser</option>
            {services.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : viewMode === 'calendar' ? (
        /* Calendar View */
        <div className="card overflow-hidden">
          <div className="grid grid-cols-8 border-b">
            <div className="p-3 text-xs font-medium text-gray-500 border-r bg-gray-50"></div>
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className={`p-3 text-center border-r last:border-r-0 ${isSameDay(day, new Date()) ? 'bg-primary-50' : 'bg-gray-50'}`}
              >
                <p className="text-xs font-medium text-gray-500">
                  {format(day, 'EEEE', { locale: da })}
                </p>
                <p className={`text-lg font-semibold ${isSameDay(day, new Date()) ? 'text-primary-600' : ''}`}>
                  {format(day, 'd')}
                </p>
              </div>
            ))}
          </div>

          <div className="max-h-[600px] overflow-y-auto">
            {hours.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b last:border-b-0">
                <div className="p-2 text-xs text-gray-500 border-r bg-gray-50 flex items-start justify-end pr-3">
                  {hour}:00
                </div>
                {weekDays.map((day) => {
                  const dayBookings = getBookingsForDay(day).filter(b => {
                    const bookingHour = new Date(b.start_time).getHours();
                    return bookingHour === hour;
                  });

                  return (
                    <div
                      key={day.toISOString()}
                      className="p-1 border-r last:border-r-0 min-h-[60px]"
                    >
                      {dayBookings.map((booking) => (
                        <button
                          key={booking.id}
                          onClick={() => setSelectedBooking(booking)}
                          className={`w-full text-left p-2 rounded text-xs mb-1 ${
                            booking.status === 'confirmed'
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : booking.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                              : booking.status === 'cancelled'
                              ? 'bg-red-100 text-red-800 hover:bg-red-200'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          <p className="font-medium truncate">{booking.customer?.name}</p>
                          <p className="truncate">{format(new Date(booking.start_time), 'HH:mm')} - {booking.service?.name}</p>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="card">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dato/Tid</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kunde</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ydelse</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Ingen bookinger i denne periode
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-medium">{format(new Date(booking.start_time), 'EEEE d. MMM', { locale: da })}</p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(booking.start_time), 'HH:mm')} - {format(new Date(booking.end_time), 'HH:mm')}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-medium">{booking.customer?.name}</p>
                      <p className="text-sm text-gray-500">{booking.customer?.email}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {booking.service?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <BookingStatusBadge status={booking.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setSelectedBooking(booking)}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        Vis detaljer
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Booking Detail Sidebar */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-25" onClick={() => setSelectedBooking(null)} />
          <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-xl">
            <div className="flex flex-col h-full">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Booking detaljer</h2>
                  <button onClick={() => setSelectedBooking(null)} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <div className="mt-1">
                      <BookingStatusBadge status={selectedBooking.status} />
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Kunde</p>
                    <p className="font-medium">{selectedBooking.customer?.name}</p>
                    <p className="text-sm text-gray-600">{selectedBooking.customer?.email}</p>
                    {selectedBooking.customer?.phone && (
                      <p className="text-sm text-gray-600">{selectedBooking.customer?.phone}</p>
                    )}
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Ydelse</p>
                    <p className="font-medium">{selectedBooking.service?.name}</p>
                    <p className="text-sm text-gray-600">{selectedBooking.service?.duration_minutes} min</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Tidspunkt</p>
                    <p className="font-medium">
                      {format(new Date(selectedBooking.start_time), 'EEEE d. MMMM yyyy', { locale: da })}
                    </p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(selectedBooking.start_time), 'HH:mm')} - {format(new Date(selectedBooking.end_time), 'HH:mm')}
                    </p>
                  </div>

                  {selectedBooking.notes && (
                    <div>
                      <p className="text-sm text-gray-500">Kundens noter</p>
                      <p className="text-sm bg-gray-50 p-3 rounded-lg">{selectedBooking.notes}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-gray-500 mb-2">Notifikationer</p>
                    <div className="space-y-1 text-sm">
                      <p>
                        Bekræftelse: {selectedBooking.confirmation_sent_at
                          ? format(new Date(selectedBooking.confirmation_sent_at), 'd. MMM HH:mm', { locale: da })
                          : 'Ikke sendt'}
                      </p>
                      <p>
                        Påmindelse: {selectedBooking.reminder_sent_at
                          ? format(new Date(selectedBooking.reminder_sent_at), 'd. MMM HH:mm', { locale: da })
                          : 'Ikke sendt'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t space-y-3">
                {selectedBooking.status === 'pending' && (
                  <button
                    onClick={() => handleStatusChange(selectedBooking.id, 'confirmed')}
                    className="btn btn-primary w-full"
                  >
                    Bekræft booking
                  </button>
                )}
                {selectedBooking.status === 'confirmed' && (
                  <button
                    onClick={() => handleStatusChange(selectedBooking.id, 'completed')}
                    className="btn btn-primary w-full"
                  >
                    Marker som gennemført
                  </button>
                )}
                {['pending', 'confirmed'].includes(selectedBooking.status) && (
                  <button
                    onClick={() => handleStatusChange(selectedBooking.id, 'cancelled')}
                    className="btn btn-danger w-full"
                  >
                    Aflys booking
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
