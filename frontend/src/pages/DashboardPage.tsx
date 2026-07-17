import { isAxiosError } from 'axios'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '../api/apiClient'
import { useAuth } from '../auth/AuthContext'

export function DashboardPage() {
  const { user } = useAuth()
  const [adminMessage, setAdminMessage] = useState('')
  const [adminError, setAdminError] = useState('')
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(false)

  async function checkAdminAccess() {
    setAdminMessage('')
    setAdminError('')
    setIsCheckingAdmin(true)

    try {
      const response = await apiClient.get<{ message: string }>('/auth/admin-check')
      setAdminMessage(response.data.message)
    } catch (error) {
      setAdminError(getErrorMessage(error, 'Admin check failed'))
    } finally {
      setIsCheckingAdmin(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <main className="page dashboard-page">
      <section className="dashboard-layout">
        <div className="welcome-panel">
        <p className="eyebrow">Dashboard</p>
        <h1>Hello, {user.name}</h1>
        <p className="lede">You are logged in to AI BookingMate.</p>
        </div>

        <dl className="user-details stat-grid">
          <div className="stat-card">
            <dt>Name</dt>
            <dd>{user.name}</dd>
          </div>
          <div className="stat-card">
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="stat-card">
            <dt>Role</dt>
            <dd>{user.role}</dd>
          </div>
        </dl>

        <section className="page-grid">
          <article className="action-card">
            <h2>Quick actions</h2>
            <div className="booking-actions">
              <Link className="button primary" to="/services">
                Browse services
              </Link>
              <Link className="button secondary" to="/assistant">
                Ask assistant
              </Link>
              <Link className="button secondary" to="/my-bookings">
                View my bookings
              </Link>
              {user.role === 'ADMIN' ? (
                <>
                  <Link className="button ghost" to="/admin/bookings">
                    Manage bookings
                  </Link>
                  <Link className="button ghost" to="/admin/business-rules">
                    Manage rules
                  </Link>
                </>
              ) : null}
            </div>
          </article>

          <article className="action-card admin-check">
            <h2>System status</h2>
            <p className="card-description">
              Confirm your token and role are accepted by admin-only backend
              routes.
            </p>
          <button
            className="button secondary"
            type="button"
            onClick={checkAdminAccess}
            disabled={isCheckingAdmin}
          >
            {isCheckingAdmin ? 'Checking...' : 'Verify admin access'}
          </button>

          {adminMessage ? <p className="success-message">{adminMessage}</p> : null}
          {adminError ? <p className="error-message">{adminError}</p> : null}
          </article>
        </section>
      </section>
    </main>
  )
}

function getErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message

    if (Array.isArray(message)) {
      return message.join(', ')
    }

    if (message) {
      return message
    }
  }

  return fallback
}
