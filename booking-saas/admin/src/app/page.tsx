'use client';

import { useState, useEffect } from 'react';
import { createClient, getDashboardStats, getBookings, getBusiness } from '@/lib/supabase';
import type { Business, Booking, DashboardStats, SUBSCRIPTION_LIMITS } from '@/types';
import Link from 'next/link';
import { format, startOfDay, endOfDay } from 'date-fns';
import { da } from 'date-fns/locale';

function StatCard({ title, value, subtitle, trend }: {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; positive: boolean };
}) {
  return (
    <div className="card p-6">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
      {subtitle && (
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      )}
      {trend && (
        <p className={`mt-2 text-sm ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
          {trend.positive ? '+' : ''}{trend.value}% fra sidste uge
        </p>
      )}
    </div>
  );
}

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

export default function DashboardPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const loadData = async () => {
      const businessData = await getBusiness(supabase);
      if (!businessData) {
        setLoading(false);
        return;
      }

      setBusiness(businessData);

      const [statsData, bookingsData] = await Promise.all([
        getDashboardStats(supabase, businessData.id),
        getBookings(supabase, businessData.id, {
          startDate: startOfDay(new Date()),
          endDate: endOfDay(new Date()),
        }),
      ]);

      setStats(statsData);
      setTodayBookings(bookingsData.data);
      setLoading(false);
    };

    loadData();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <h2 className="text-xl font-semibold mb-4">Velkommen til Booking.gl</h2>
        <p className="text-gray-600 mb-6">
          Du har endnu ikke oprettet en virksomhed. Kom i gang ved at oprette din virksomhedsprofil.
        </p>
        <Link href="/settings" className="btn btn-primary">
          Opret virksomhed
        </Link>
      </div>
    );
  }

  const subscriptionLimits = {
    free: { bookings: 25, sms: 0 },
    starter: { bookings: 100, sms: 50 },
    pro: { bookings: Infinity, sms: Infinity },
    business: { bookings: Infinity, sms: Infinity },
  };

  const limits = subscriptionLimits[business.subscription_tier];
  const bookingUsage = limits.bookings === Infinity
    ? null
    : Math.round((business.monthly_booking_count / limits.bookings) * 100);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">
          {format(new Date(), "EEEE 'd.' d. MMMM yyyy", { locale: da })}
        </p>
      </div>

      {/* Usage warning */}
      {bookingUsage !== null && bookingUsage >= 80 && (
        <div className={`mb-6 p-4 rounded-lg ${bookingUsage >= 100 ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
          <p className={`text-sm ${bookingUsage >= 100 ? 'text-red-700' : 'text-yellow-700'}`}>
            {bookingUsage >= 100
              ? `Du har nået din månedlige grænse på ${limits.bookings} bookinger. Opgrader for at modtage flere bookinger.`
              : `Du har brugt ${business.monthly_booking_count} af ${limits.bookings} bookinger denne måned (${bookingUsage}%).`
            }
            <Link href="/settings" className="ml-2 underline font-medium">
              Opgrader nu
            </Link>
          </p>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Bookinger i dag"
          value={stats?.today_bookings || 0}
        />
        <StatCard
          title="Bookinger denne uge"
          value={stats?.week_bookings || 0}
        />
        <StatCard
          title="Nye kunder (uge)"
          value={stats?.new_customers_week || 0}
        />
        <StatCard
          title="Aflysninger (måned)"
          value={stats?.cancellations_month || 0}
          subtitle={stats?.no_shows_month ? `${stats.no_shows_month} udeblevne` : undefined}
        />
      </div>

      {/* Today's bookings */}
      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Dagens bookinger</h2>
            <Link
              href="/bookings"
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Se alle
            </Link>
          </div>
        </div>

        {todayBookings.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>Ingen bookinger i dag</p>
            <Link
              href="/bookings"
              className="mt-2 inline-block text-sm text-primary-600 hover:text-primary-700"
            >
              Opret manuel booking
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {todayBookings.map((booking) => (
              <div
                key={booking.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[60px]">
                      <p className="text-lg font-semibold">
                        {format(new Date(booking.start_time), 'HH:mm')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(booking.end_time), 'HH:mm')}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">{booking.customer?.name}</p>
                      <p className="text-sm text-gray-500">
                        {booking.service?.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <BookingStatusBadge status={booking.status} />
                    <Link
                      href={`/bookings/${booking.id}`}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/services"
          className="card p-6 hover:border-primary-300 transition-colors group"
        >
          <h3 className="font-medium group-hover:text-primary-600">Administrer ydelser</h3>
          <p className="text-sm text-gray-500 mt-1">Tilføj eller rediger dine ydelser</p>
        </Link>
        <Link
          href="/settings"
          className="card p-6 hover:border-primary-300 transition-colors group"
        >
          <h3 className="font-medium group-hover:text-primary-600">Widget embed kode</h3>
          <p className="text-sm text-gray-500 mt-1">Få koden til din hjemmeside</p>
        </Link>
        <Link
          href="/customers"
          className="card p-6 hover:border-primary-300 transition-colors group"
        >
          <h3 className="font-medium group-hover:text-primary-600">Se kundeliste</h3>
          <p className="text-sm text-gray-500 mt-1">Oversigt over dine kunder</p>
        </Link>
      </div>
    </div>
  );
}
