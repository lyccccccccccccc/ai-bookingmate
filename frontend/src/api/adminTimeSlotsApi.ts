import { apiClient } from './apiClient'
import type { TimeSlot } from './servicesApi'

export type TimeSlotStatus = 'AVAILABLE' | 'BOOKED' | 'BLOCKED'

export type AdminTimeSlot = TimeSlot & {
  service: {
    id: string
    name: string
    durationMinutes: number
  }
}

export type AdminTimeSlotFilters = {
  serviceId?: string
  status?: TimeSlotStatus
}

export type CreateTimeSlotData = {
  serviceId: string
  startAt: string
  endAt: string
  status?: Exclude<TimeSlotStatus, 'BOOKED'>
  capacity?: number
}

export async function getAdminTimeSlots(filters: AdminTimeSlotFilters = {}) {
  const response = await apiClient.get<AdminTimeSlot[]>('/time-slots', {
    params: filters,
  })
  return response.data
}

export async function createTimeSlot(data: CreateTimeSlotData) {
  const response = await apiClient.post<TimeSlot>('/time-slots', data)
  return response.data
}

export async function updateTimeSlotStatus(
  id: string,
  status: Exclude<TimeSlotStatus, 'BOOKED'>,
) {
  const response = await apiClient.patch<TimeSlot>(`/time-slots/${id}/status`, {
    status,
  })
  return response.data
}

export async function updateTimeSlotCapacity(id: string, capacity: number) {
  const response = await apiClient.patch<TimeSlot>(`/time-slots/${id}/capacity`, {
    capacity,
  })
  return response.data
}
