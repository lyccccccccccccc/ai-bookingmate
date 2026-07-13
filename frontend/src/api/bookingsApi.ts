import { apiClient } from './apiClient'
import type { Service, TimeSlot } from './servicesApi'

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED'

export type Booking = {
  id: string
  customerId: string
  serviceId: string
  timeSlotId: string
  status: BookingStatus
  notes: string | null
  createdAt: string
  updatedAt: string
  service: Pick<Service, 'id' | 'name' | 'durationMinutes' | 'priceCents'>
  timeSlot: Pick<TimeSlot, 'id' | 'serviceId' | 'startAt' | 'endAt' | 'status'>
}

export async function createBooking(timeSlotId: string, notes?: string) {
  const response = await apiClient.post<Booking>('/bookings', {
    timeSlotId,
    notes,
  })
  return response.data
}

export async function getMyBookings() {
  const response = await apiClient.get<Booking[]>('/bookings/my')
  return response.data
}

export async function cancelMyBooking(bookingId: string) {
  const response = await apiClient.patch<Booking>(`/bookings/${bookingId}/cancel`)
  return response.data
}
