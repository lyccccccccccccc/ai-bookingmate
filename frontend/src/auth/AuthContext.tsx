import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiClient } from '../api/apiClient'

type User = {
  id: string
  email: string
  name: string
  role: 'CUSTOMER' | 'ADMIN'
}

type AuthResponse = {
  user: User
  accessToken: string
}

type AuthContextValue = {
  user: User | null
  accessToken: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  loadCurrentUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    localStorage.getItem('accessToken'),
  )
  const [isLoading, setIsLoading] = useState(true)

  const saveSession = useCallback((authResponse: AuthResponse) => {
    localStorage.setItem('accessToken', authResponse.accessToken)
    setAccessToken(authResponse.accessToken)
    setUser(authResponse.user)
  }, [])

  const clearSession = useCallback(() => {
    localStorage.removeItem('accessToken')
    setAccessToken(null)
    setUser(null)
  }, [])

  const loadCurrentUser = useCallback(async () => {
    const storedToken = localStorage.getItem('accessToken')

    if (!storedToken) {
      clearSession()
      setIsLoading(false)
      return
    }

    try {
      setAccessToken(storedToken)
      const response = await apiClient.get<User>('/auth/me')
      setUser(response.data)
    } catch {
      clearSession()
    } finally {
      setIsLoading(false)
    }
  }, [clearSession])

  useEffect(() => {
    void loadCurrentUser()
  }, [loadCurrentUser])

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await apiClient.post<AuthResponse>('/auth/login', {
        email,
        password,
      })
      saveSession(response.data)
    },
    [saveSession],
  )

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const response = await apiClient.post<AuthResponse>('/auth/register', {
        email,
        password,
        name,
      })
      saveSession(response.data)
    },
    [saveSession],
  )

  const value = useMemo(
    () => ({
      user,
      accessToken,
      isLoading,
      login,
      register,
      logout: clearSession,
      loadCurrentUser,
    }),
    [accessToken, clearSession, isLoading, loadCurrentUser, login, register, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
