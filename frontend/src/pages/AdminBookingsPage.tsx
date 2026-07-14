import { isAxiosError } from 'axios'
import { useEffect, useState } from 'react'
import {
  getAllBookings,
  updateBookingStatus,
  type AdminBooking,
} from '../api/adminBookingsApi'
import type { BookingStatus } from '../api/bookingsApi'
import { formatDate, formatTime } from '../components/TimeSlotCard'

type StatusFilter = 'ALL' | BookingStatus

const statusOptions: StatusFilter[] = [
  'ALL',
  'PENDING',
  'CONFIRMED',
  'CANCELLED',
]

export function AdminBookingsPage() {
  const [bookings, setBookings] = useState<AdminBooking[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null)

  async function loadBookings(filter: StatusFilter) {
    setError('')
    const data = await getAllBookings(
      filter === 'ALL' ? {} : { status: filter },
    )
    setBookings(data)
  }

  useEffect(() => {
    let isMounted = true

    async function loadFilteredBookings() {
      setIsLoading(true)
      setMessage('')

      try {
        const data = await getAllBookings(
          statusFilter === 'ALL' ? {} : { status: statusFilter },
        )

        if (isMounted) {
          setBookings(data)
          setError('')
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(getErrorMessage(caughtError, 'Could not load bookings'))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadFilteredBookings()

    return () => {
      isMounted = false
    }
  }, [statusFilter])

  async function handleStatusUpdate(
    bookingId: string,
    status: 'CONFIRMED' | 'CANCELLED',
  ) {
    setMessage('')
    setError('')
    setUpdatingBookingId(bookingId)

    try {
      await updateBookingStatus(bookingId, status)
      await loadBookings(statusFilter)
      setMessage(`Booking ${status.toLowerCase()} successfully.`)
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Could not update booking'))
    } finally {
      setUpdatingBookingId(null)
    }
  }

  return (
    <main className="page admin-bookings-page">
      <section className="page-header">
        <p className="eyebrow">Admin</p>
        <h1>Booking Management</h1>
        <p className="lede">
          Review customer bookings and update pending or confirmed appointments.
        </p>
      </section>

      <section className="admin-toolbar" aria-label="Booking filters">
        <label className="filter-label">
          Status filter
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </section>

      {message ? <p className="success-message">{message}</p> : null}
      {isLoading ? <p className="state-message">Loading bookings...</p> : null}
      {error ? <p className="error-message">{error}</p> : null}
      {!isLoading && !error && bookings.length === 0 ? (
        <p className="state-message">No bookings match this filter.</p>
      ) : null}

      {!isLoading && bookings.length > 0 ? (
        <section className="bookings-list" aria-label="Admin bookings">
          {bookings.map((booking) => (
            <AdminBookingCard
              key={booking.id}
              booking={booking}
              isUpdating={updatingBookingId === booking.id}
              onConfirm={() =>
                void handleStatusUpdate(booking.id, 'CONFIRMED')
              }
              onCancel={() => void handleStatusUpdate(booking.id, 'CANCELLED')}
            />
          ))}
        </section>
      ) : null}
    </main>
  )
}

function AdminBookingCard({
  booking,
  isUpdating,
  onConfirm,
  onCancel,
}: {
  booking: AdminBooking
  isUpdating: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const startAt = new Date(booking.timeSlot.startAt)
  const endAt = new Date(booking.timeSlot.endAt)

  return (
    <article className="booking-card admin-booking-card">
      <div className="booking-card-header">
        <div>
          <h2>{booking.service.name}</h2>
          <p className="card-description">Booking ID: {booking.id}</p>
        </div>
        <span className={`status-pill status-${booking.status.toLowerCase()}`}>
          {booking.status}
        </span>
      </div>

      <div className="booking-details-grid admin-booking-grid">
        <div>
          <dt>Customer</dt>
          <dd>{booking.customer.name}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{booking.customer.email}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{formatDate(startAt)}</dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>
            {formatTime(startAt)} to {formatTime(endAt)}
          </dd>
        </div>
      </div>

      {booking.notes ? <p className="booking-notes">{booking.notes}</p> : null}

      <div className="booking-actions">
        {booking.status === 'PENDING' ? (
          <button
            className="button primary"
            type="button"
            onClick={onConfirm}
            disabled={isUpdating}
          >
            {isUpdating ? 'Updating...' : 'Confirm'}
          </button>
        ) : null}

        {booking.status !== 'CANCELLED' ? (
          <button
            className="button danger"
            type="button"
            onClick={onCancel}
            disabled={isUpdating}
          >
            {isUpdating ? 'Updating...' : 'Cancel'}
          </button>
        ) : null}
      </div>
    </article>
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
