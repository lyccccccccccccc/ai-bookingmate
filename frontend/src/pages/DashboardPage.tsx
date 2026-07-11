import { isAxiosError } from 'axios'
import { useState } from 'react'
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
      <section className="panel">
        <p className="eyebrow">Dashboard</p>
        <h1>Hello, {user.name}</h1>
        <p className="lede">You are logged in to AI BookingMate.</p>

        <dl className="user-details">
          <div>
            <dt>Name</dt>
            <dd>{user.name}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{user.role}</dd>
          </div>
        </dl>

        <div className="admin-check">
          <button
            className="button secondary"
            type="button"
            onClick={checkAdminAccess}
            disabled={isCheckingAdmin}
          >
            {isCheckingAdmin ? 'Checking...' : 'Test admin access'}
          </button>

          {adminMessage ? <p className="success-message">{adminMessage}</p> : null}
          {adminError ? <p className="error-message">{adminError}</p> : null}
        </div>
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
