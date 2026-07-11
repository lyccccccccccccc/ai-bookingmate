import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function ProtectedRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <main className="page">Loading...</main>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
