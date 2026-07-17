import { isAxiosError } from 'axios'
import { useEffect, useState } from 'react'
import {
  cancelMyBooking,
  getMyBookings,
  type Booking,
} from '../api/bookingsApi'
import { formatPrice } from '../components/ServiceCard'
import { formatDate, formatTime } from '../components/TimeSlotCard'
import type { BookingStatus } from '../api/bookingsApi'

type BookingFilter = 'ALL' | BookingStatus

const bookingFilters: BookingFilter[] = [
  'ALL',
  'PENDING',
  'CONFIRMED',
  'CANCELLED',
]

export function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [filter, setFilter] = useState<BookingFilter>('ALL')
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(
    null,
  )

  async function loadBookings() {
    setError('')
    const data = await getMyBookings()
    setBookings(data)
  }

  useEffect(() => {
    let isMounted = true

    async function loadInitialBookings() {
      try {
        const data = await getMyBookings()

        if (isMounted) {
          setBookings(data)
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

    void loadInitialBookings()

    return () => {
      isMounted = false
    }
  }, [])

  async function handleCancel(bookingId: string) {
    setMessage('')
    setError('')
    setCancellingBookingId(bookingId)

    try {
      await cancelMyBooking(bookingId)
      await loadBookings()
      setMessage('Booking cancelled successfully.')
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Could not cancel booking'))
    } finally {
      setCancellingBookingId(null)
    }
  }

  const filteredBookings =
    filter === 'ALL'
      ? bookings
      : bookings.filter((booking) => booking.status === filter)
  const pendingCount = bookings.filter((booking) => booking.status === 'PENDING')
    .length
  const confirmedCount = bookings.filter(
    (booking) => booking.status === 'CONFIRMED',
  ).length
  const cancelledCount = bookings.filter(
    (booking) => booking.status === 'CANCELLED',
  ).length

  return (
    <main className="page my-bookings-page">
      <section className="page-header">
        <p className="eyebrow">Your schedule</p>
        <h1>My Bookings</h1>
        <p className="lede">
          Review your bookings and cancel any appointment you no longer need.
        </p>
      </section>

      {message ? <p className="success-message">{message}</p> : null}
      {isLoading ? <p className="state-message">Loading bookings...</p> : null}
      {error ? <p className="error-message">{error}</p> : null}
      {!isLoading && !error && bookings.length === 0 ? (
        <p className="state-message">You do not have any bookings yet.</p>
      ) : null}

      {!isLoading && bookings.length > 0 ? (
        <>
          <section className="stat-grid" aria-label="Booking summary">
            <article className="stat-card">
              <strong>{bookings.length}</strong>
              <span>Total bookings</span>
            </article>
            <article className="stat-card">
              <strong>{pendingCount}</strong>
              <span>Pending</span>
            </article>
            <article className="stat-card">
              <strong>{confirmedCount}</strong>
              <span>Confirmed</span>
            </article>
            <article className="stat-card">
              <strong>{cancelledCount}</strong>
              <span>Cancelled</span>
            </article>
          </section>

          <section className="filter-tabs" aria-label="Booking status filter">
            {bookingFilters.map((status) => (
              <button
                className={`filter-tab ${filter === status ? 'active' : ''}`}
                key={status}
                type="button"
                onClick={() => setFilter(status)}
              >
                {status}
              </button>
            ))}
          </section>

          {filteredBookings.length === 0 ? (
            <p className="state-message">No bookings match this filter.</p>
          ) : null}

          {filteredBookings.length > 0 ? (
            <section className="bookings-list" aria-label="My bookings">
              {filteredBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  isCancelling={cancellingBookingId === booking.id}
                  onCancel={() => void handleCancel(booking.id)}
                />
              ))}
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  )
}

function BookingCard({
  booking,
  isCancelling,
  onCancel,
}: {
  booking: Booking
  isCancelling: boolean
  onCancel: () => void
}) {
  const startAt = new Date(booking.timeSlot.startAt)
  const endAt = new Date(booking.timeSlot.endAt)
  const createdAt = new Date(booking.createdAt)

  return (
    <article className="booking-card">
      <div className="booking-card-header">
        <div>
          <h2>{booking.service.name}</h2>
          <p className="card-description">
            {booking.service.durationMinutes} minutes |{' '}
            {formatPrice(booking.service.priceCents)}
          </p>
        </div>
        <span className={`status-pill status-${booking.status.toLowerCase()}`}>
          {booking.status}
        </span>
      </div>

      <div className="booking-details-grid">
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
        <div>
          <dt>Booked</dt>
          <dd>{formatDate(createdAt)}</dd>
        </div>
      </div>

      {booking.notes ? <p className="booking-notes">{booking.notes}</p> : null}

      {booking.status !== 'CANCELLED' ? (
        <button
          className="button danger"
          type="button"
          onClick={onCancel}
          disabled={isCancelling}
        >
          {isCancelling ? 'Cancelling...' : 'Cancel Booking'}
        </button>
      ) : null}
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
