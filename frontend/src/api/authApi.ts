import { apiClient } from './apiClient'

export type ForgotPasswordResponse = {
  message: string
  devResetToken?: string
  devResetUrl?: string
}

export async function forgotPassword(email: string) {
  const response = await apiClient.post<ForgotPasswordResponse>('/auth/forgot-password', {
    email,
  })
  return response.data
}

export async function resetPassword(token: string, newPassword: string) {
  const response = await apiClient.post<{ message: string }>('/auth/reset-password', {
    token,
    newPassword,
  })
  return response.data
}
