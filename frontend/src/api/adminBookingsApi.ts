import { apiClient } from './apiClient'
import type { Booking, BookingStatus } from './bookingsApi'

export type AdminBooking = Booking & {
  customer: {
    id: string
    email: string
    name: string
    role: 'CUSTOMER' | 'ADMIN'
  }
}

export type AdminBookingFilters = {
  status?: BookingStatus
  serviceId?: string
  customerId?: string
}

export async function getAllBookings(filters: AdminBookingFilters = {}) {
  const response = await apiClient.get<AdminBooking[]>('/bookings', {
    params: filters,
  })
  return response.data
}

export async function updateBookingStatus(
  bookingId: string,
  status: 'CONFIRMED' | 'CANCELLED',
) {
  const response = await apiClient.patch<AdminBooking>(
    `/bookings/${bookingId}/status`,
    { status },
  )
  return response.data
}
