import { apiClient } from './apiClient'
import type { Service } from './servicesApi'

export type ServiceFormData = {
  name: string
  description?: string
  durationMinutes: number
  priceCents?: number
}

export async function createService(data: ServiceFormData) {
  const response = await apiClient.post<Service>('/services', data)
  return response.data
}

export async function updateService(id: string, data: Partial<ServiceFormData>) {
  const response = await apiClient.patch<Service>(`/services/${id}`, data)
  return response.data
}

export async function deactivateService(id: string) {
  const response = await apiClient.delete<Service>(`/services/${id}`)
  return response.data
}
