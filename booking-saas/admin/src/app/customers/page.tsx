'use client';

import { useState, useEffect } from 'react';
import { createClient, getCustomers, getBusiness, getBookings } from '@/lib/supabase';
import type { Business, Customer, Booking } from '@/types';
import { format } from 'date-fns';
import { da } from 'date-fns/locale';

export default function CustomersPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerBookings, setCustomerBookings] = useState<Booking[]>([]);
  const supabase = createClient();
  const pageSize = 20;

  useEffect(() => {
    loadData();
  }, [page, search]);

  const loadData = async () => {
    setLoading(true);
    const businessData = await getBusiness(supabase);
    if (!businessData) {
      setLoading(false);
      return;
    }

    setBusiness(businessData);

    const { data, count } = await getCustomers(supabase, businessData.id, {
      limit: pageSize,
      offset: page * pageSize,
      search: search || undefined,
    });

    setCustomers(data);
    setTotalCount(count || 0);
    setLoading(false);
  };

  const loadCustomerBookings = async (customer: Customer) => {
    if (!business) return;

    const { data } = await getBookings(supabase, business.id, {
      customerId: customer.id,
      limit: 10,
    });

    setCustomerBookings(data);
  };

  const handleSelectCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    await loadCustomerBookings(customer);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kunder</h1>
          <p className="text-gray-600">{totalCount} kunder i alt</p>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4 mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Søg efter navn, email eller telefon..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="input pl-10"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kunde</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kontakt</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bookinger</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Oprettet</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      {search ? 'Ingen kunder matcher din søgning' : 'Ingen kunder endnu'}
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-medium">{customer.name}</p>
                        {customer.notes && (
                          <p className="text-sm text-gray-500 truncate max-w-xs">{customer.notes}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm">{customer.email || '-'}</p>
                        <p className="text-sm text-gray-500">{customer.phone || '-'}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm">
                          {customer.total_bookings} total
                          {customer.no_shows > 0 && (
                            <span className="text-orange-600 ml-2">({customer.no_shows} udeblevne)</span>
                          )}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(customer.created_at), 'd. MMM yyyy', { locale: da })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleSelectCustomer(customer)}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Viser {page * pageSize + 1}-{Math.min((page + 1) * pageSize, totalCount)} af {totalCount}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="btn btn-secondary"
                >
                  Forrige
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="btn btn-secondary"
                >
                  Næste
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Customer Detail Sidebar */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-25" onClick={() => setSelectedCustomer(null)} />
          <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-xl">
            <div className="flex flex-col h-full">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{selectedCustomer.name}</h2>
                  <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{selectedCustomer.email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Telefon</p>
                      <p className="font-medium">{selectedCustomer.phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Foretrukket kontakt</p>
                      <p className="font-medium">
                        {selectedCustomer.preferred_contact === 'both'
                          ? 'Email & SMS'
                          : selectedCustomer.preferred_contact === 'email'
                          ? 'Email'
                          : 'SMS'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Kunde siden</p>
                      <p className="font-medium">
                        {format(new Date(selectedCustomer.created_at), 'd. MMM yyyy', { locale: da })}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{selectedCustomer.total_bookings}</p>
                      <p className="text-sm text-gray-500">Bookinger</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">{selectedCustomer.no_shows}</p>
                      <p className="text-sm text-gray-500">Udeblevne</p>
                    </div>
                  </div>

                  {selectedCustomer.notes && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Noter</p>
                      <p className="text-sm bg-gray-50 p-3 rounded-lg">{selectedCustomer.notes}</p>
                    </div>
                  )}

                  <div>
                    <h3 className="font-medium mb-3">Seneste bookinger</h3>
                    {customerBookings.length === 0 ? (
                      <p className="text-sm text-gray-500">Ingen bookinger endnu</p>
                    ) : (
                      <div className="space-y-2">
                        {customerBookings.map((booking) => (
                          <div key={booking.id} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{booking.service?.name}</p>
                                <p className="text-xs text-gray-500">
                                  {format(new Date(booking.start_time), 'd. MMM yyyy HH:mm', { locale: da })}
                                </p>
                              </div>
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${
                                  booking.status === 'confirmed'
                                    ? 'bg-green-100 text-green-800'
                                    : booking.status === 'cancelled'
                                    ? 'bg-red-100 text-red-800'
                                    : booking.status === 'completed'
                                    ? 'bg-gray-100 text-gray-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {booking.status === 'confirmed'
                                  ? 'Bekræftet'
                                  : booking.status === 'cancelled'
                                  ? 'Aflyst'
                                  : booking.status === 'completed'
                                  ? 'Gennemført'
                                  : 'Afventer'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
