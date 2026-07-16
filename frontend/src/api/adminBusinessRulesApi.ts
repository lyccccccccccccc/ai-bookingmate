import { apiClient } from './apiClient'

export type BusinessRule = {
  id: string
  title: string
  category: string
  content: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type BusinessRuleFilters = {
  category?: string
  isActive?: boolean
}

export type BusinessRuleFormData = {
  title: string
  category: string
  content: string
}

export type BusinessRuleUpdateData = BusinessRuleFormData & {
  isActive?: boolean
}

export async function getBusinessRules(filters: BusinessRuleFilters = {}) {
  const response = await apiClient.get<BusinessRule[]>('/business-rules', {
    params: filters,
  })
  return response.data
}

export async function createBusinessRule(data: BusinessRuleFormData) {
  const response = await apiClient.post<BusinessRule>('/business-rules', data)
  return response.data
}

export async function updateBusinessRule(
  id: string,
  data: Partial<BusinessRuleUpdateData>,
) {
  const response = await apiClient.patch<BusinessRule>(
    `/business-rules/${id}`,
    data,
  )
  return response.data
}

export async function deactivateBusinessRule(id: string) {
  const response = await apiClient.delete<BusinessRule>(`/business-rules/${id}`)
  return response.data
}
