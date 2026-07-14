import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'

type AdminRouteProps = {
  children?: ReactNode
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <main className="page">Loading...</main>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role !== 'ADMIN') {
    return (
      <main className="page">
        <section className="panel access-denied-panel">
          <p className="eyebrow">Admin only</p>
          <h1>Access denied</h1>
          <p className="lede">
            You need an admin account to view booking management.
          </p>
        </section>
      </main>
    )
  }

  return children ?? <Outlet />
}
