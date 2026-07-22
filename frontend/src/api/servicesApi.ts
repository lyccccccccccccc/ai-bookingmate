import { apiClient } from './apiClient'

export type Service = {
  id: string
  name: string
  description: string | null
  durationMinutes: number
  priceCents: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type TimeSlot = {
  id: string
  serviceId: string
  startAt: string
  endAt: string
  status: 'AVAILABLE' | 'BOOKED' | 'BLOCKED'
  capacity: number
  activeBookingCount: number
  remainingSpots: number
  isFull: boolean
  createdAt: string
  updatedAt: string
}

export async function getServices() {
  const response = await apiClient.get<Service[]>('/services')
  return response.data
}

export async function getServiceById(id: string) {
  const response = await apiClient.get<Service>(`/services/${id}`)
  return response.data
}

export async function getAvailableTimeSlots(serviceId: string) {
  const response = await apiClient.get<TimeSlot[]>(
    `/services/${serviceId}/time-slots`,
  )
  return response.data
}
