import { isAxiosError } from 'axios'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyBookings, type Booking } from '../api/bookingsApi'
import { apiClient } from '../api/apiClient'
import { useAuth } from '../auth/AuthContext'
import { Reveal } from '../components/Reveal'
import '../workspace-v2.css'

export function DashboardPage() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoadingBookings, setIsLoadingBookings] = useState(true)
  const [bookingsError, setBookingsError] = useState('')
  const [adminMessage, setAdminMessage] = useState('')
  const [adminError, setAdminError] = useState('')
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadBookingSummary() {
      try {
        const data = await getMyBookings()

        if (isMounted) {
          setBookings(data)
        }
      } catch {
        if (isMounted) {
          setBookingsError('Booking summary is temporarily unavailable.')
        }
      } finally {
        if (isMounted) {
          setIsLoadingBookings(false)
        }
      }
    }

    void loadBookingSummary()

    return () => {
      isMounted = false
    }
  }, [])

  const summary = useMemo(() => {
    const activeBookings = bookings.filter(
      (booking) => booking.status !== 'CANCELLED',
    )
    const now = Date.now()
    const upcomingBookings = activeBookings.filter(
      (booking) => new Date(booking.timeSlot.startAt).getTime() >= now,
    )

    return {
      active: activeBookings.length,
      upcoming: upcomingBookings.length,
    }
  }, [bookings])

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
    <main className="page dashboard-page dashboard-v2-page">
      <Reveal>
        <header className="workspace-hero">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>Welcome back, {user.name}</h1>
            <p className="lede">
              Manage your bookings and continue where you left off.
            </p>
          </div>
          <div className="workspace-profile-chip">
            <span aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span>
            <div>
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </div>
          </div>
        </header>
      </Reveal>

      <section className="workspace-summary-grid" aria-label="Account summary">
        <Reveal delay={0.04}>
          <article className="workspace-summary-card">
            <span>Upcoming bookings</span>
            <strong>{isLoadingBookings ? '--' : summary.upcoming}</strong>
            <small>Scheduled from today onward</small>
          </article>
        </Reveal>
        <Reveal delay={0.08}>
          <article className="workspace-summary-card">
            <span>Active bookings</span>
            <strong>{isLoadingBookings ? '--' : summary.active}</strong>
            <small>Pending and confirmed sessions</small>
          </article>
        </Reveal>
        <Reveal delay={0.12}>
          <article className="workspace-summary-card workspace-role-card">
            <span>Account role</span>
            <strong>{user.role === 'ADMIN' ? 'Admin' : 'Customer'}</strong>
            <small>Access based on your current account</small>
          </article>
        </Reveal>
      </section>

      {bookingsError ? (
        <p className="workspace-inline-note" role="status">{bookingsError}</p>
      ) : null}

      <section className="workspace-main-grid">
        <Reveal>
          <article className="workspace-panel quick-actions-panel">
            <div className="workspace-panel-heading">
              <div>
                <p className="eyebrow">Quick actions</p>
                <h2>What would you like to do?</h2>
              </div>
            </div>

            <div className="workspace-action-grid">
              <WorkspaceAction
                eyebrow="Discover"
                title="Browse Services"
                description="Compare sessions and find an available time."
                to="/services"
              />
              <WorkspaceAction
                eyebrow="Support"
                title="Ask Assistant"
                description="Get grounded answers about bookings and policies."
                to="/assistant"
              />
              <WorkspaceAction
                eyebrow="Schedule"
                title="View My Bookings"
                description="Review upcoming sessions or manage a cancellation."
                to="/my-bookings"
              />
            </div>

            {user.role === 'ADMIN' ? (
              <div className="admin-shortcuts">
                <span>Admin workspace</span>
                <Link to="/admin/bookings">Manage bookings</Link>
                <Link to="/admin/business-rules">Manage rules</Link>
              </div>
            ) : null}
          </article>
        </Reveal>

        <Reveal delay={0.08}>
          <aside className="workspace-panel account-panel">
            <p className="eyebrow">Account</p>
            <h2>Your details</h2>
            <dl className="account-details-list">
              <div><dt>Name</dt><dd>{user.name}</dd></div>
              <div><dt>Email</dt><dd>{user.email}</dd></div>
              <div><dt>Role</dt><dd>{user.role}</dd></div>
            </dl>

            <div className="access-check-panel">
              <h3>Role verification</h3>
              <p>Check whether this account can access admin-only routes.</p>
              <button
                className="button secondary"
                type="button"
                onClick={checkAdminAccess}
                disabled={isCheckingAdmin}
              >
                {isCheckingAdmin ? 'Checking...' : 'Verify admin access'}
              </button>
              {adminMessage ? <p className="workspace-success">{adminMessage}</p> : null}
              {adminError ? <p className="workspace-error">{adminError}</p> : null}
            </div>
          </aside>
        </Reveal>
      </section>
    </main>
  )
}

function WorkspaceAction({
  eyebrow,
  title,
  description,
  to,
}: {
  eyebrow: string
  title: string
  description: string
  to: string
}) {
  return (
    <Link className="workspace-action-card" to={to}>
      <span>{eyebrow}</span>
      <strong>{title}</strong>
      <p>{description}</p>
      <small aria-hidden="true">Open <i /></small>
    </Link>
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
