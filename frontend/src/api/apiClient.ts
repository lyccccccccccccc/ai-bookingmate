import axios from 'axios'

type RuntimeConfig = {
  VITE_API_URL?: string
}

const runtimeConfig = (window as Window & {
  __AI_BOOKINGMATE_CONFIG__?: RuntimeConfig
}).__AI_BOOKINGMATE_CONFIG__

export const apiClient = axios.create({
  baseURL:
    runtimeConfig?.VITE_API_URL ??
    import.meta.env.VITE_API_URL ??
    import.meta.env.VITE_API_BASE_URL ??
    'http://localhost:3000',
})

apiClient.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('accessToken')

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})
