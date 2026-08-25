import { isAxiosError } from 'axios'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  cancelMyBooking,
  getMyBookings,
  type Booking,
  type BookingStatus,
} from '../api/bookingsApi'
import { Reveal } from '../components/Reveal'
import { formatPrice } from '../components/ServiceCard'
import { formatDate, formatTime } from '../components/TimeSlotCard'
import '../workspace-v2.css'

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
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null)
  const [lastCancelledBookingId, setLastCancelledBookingId] = useState<string | null>(null)

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

  async function handleCancel(booking: Booking) {
    setMessage('')
    setError('')
    setLastCancelledBookingId(null)
    setCancellingBookingId(booking.id)

    try {
      await cancelMyBooking(booking.id)
      await loadBookings()
      setLastCancelledBookingId(booking.id)
      setMessage(`${booking.service.name} was cancelled successfully.`)
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
  const pendingCount = bookings.filter((booking) => booking.status === 'PENDING').length
  const confirmedCount = bookings.filter(
    (booking) => booking.status === 'CONFIRMED',
  ).length
  const cancelledCount = bookings.filter(
    (booking) => booking.status === 'CANCELLED',
  ).length

  return (
    <main className="page my-bookings-page my-bookings-v2-page">
      <Reveal>
        <header className="workspace-hero bookings-workspace-hero">
          <div>
            <p className="eyebrow">My bookings</p>
            <h1>Your schedule, in one place</h1>
            <p className="lede">
              Review upcoming sessions, track their status, or cancel a booking
              you no longer need.
            </p>
          </div>
          {!isLoading && bookings.length > 0 ? (
            <Link className="button primary" to="/services">Book another session</Link>
          ) : null}
        </header>
      </Reveal>

      {message ? (
        <div className="workspace-alert workspace-alert-success" role="status">
          <span aria-hidden="true" />
          <p><strong>Booking updated.</strong> {message}</p>
        </div>
      ) : null}

      {error ? (
        <div className="workspace-alert workspace-alert-error" role="alert">
          <span aria-hidden="true">!</span>
          <p><strong>Something went wrong.</strong> {error}</p>
        </div>
      ) : null}

      {isLoading ? <BookingsSkeleton /> : null}

      {!isLoading && !error && bookings.length === 0 ? (
        <div className="bookings-empty-v2">
          <span className="empty-calendar" aria-hidden="true">0</span>
          <p className="eyebrow">Your schedule is clear</p>
          <h2>No bookings yet</h2>
          <p>Choose a service and reserve a time to get started.</p>
          <Link className="button primary" to="/services">Browse Services</Link>
        </div>
      ) : null}

      {!isLoading && bookings.length > 0 ? (
        <>
          <section className="bookings-summary-v2" aria-label="Booking summary">
            <SummaryItem label="All bookings" value={bookings.length} />
            <SummaryItem label="Pending" value={pendingCount} tone="pending" />
            <SummaryItem label="Confirmed" value={confirmedCount} tone="confirmed" />
            <SummaryItem label="Cancelled" value={cancelledCount} tone="cancelled" />
          </section>

          <div className="bookings-toolbar-v2">
            <div>
              <p className="eyebrow">Booking history</p>
              <h2>{filter === 'ALL' ? 'All bookings' : `${formatStatus(filter)} bookings`}</h2>
            </div>
            <section className="filter-tabs bookings-filter-v2" aria-label="Booking status filter">
              {bookingFilters.map((status) => (
                <button
                  className={`filter-tab ${filter === status ? 'active' : ''}`}
                  key={status}
                  type="button"
                  onClick={() => setFilter(status)}
                  aria-pressed={filter === status}
                >
                  {formatStatus(status)}
                </button>
              ))}
            </section>
          </div>

          {filteredBookings.length === 0 ? (
            <div className="bookings-filter-empty">
              <h3>No {formatStatus(filter).toLowerCase()} bookings</h3>
              <p>Choose another status to see the rest of your booking history.</p>
            </div>
          ) : null}

          {filteredBookings.length > 0 ? (
            <section className="bookings-list bookings-list-v2" aria-label="My bookings">
              {filteredBookings.map((booking, index) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  index={index}
                  isCancelling={cancellingBookingId === booking.id}
                  isCancellationBusy={cancellingBookingId !== null}
                  wasJustCancelled={lastCancelledBookingId === booking.id}
                  onCancel={() => void handleCancel(booking)}
                />
              ))}
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  )
}

function SummaryItem({
  label,
  value,
  tone = 'all',
}: {
  label: string
  value: number
  tone?: 'all' | 'pending' | 'confirmed' | 'cancelled'
}) {
  return (
    <article className={`booking-summary-item summary-${tone}`}>
      <span aria-hidden="true" />
      <strong>{value}</strong>
      <small>{label}</small>
    </article>
  )
}

function BookingCard({
  booking,
  index,
  isCancelling,
  isCancellationBusy,
  wasJustCancelled,
  onCancel,
}: {
  booking: Booking
  index: number
  isCancelling: boolean
  isCancellationBusy: boolean
  wasJustCancelled: boolean
  onCancel: () => void
}) {
  const reduceMotion = useReducedMotion()
  const startAt = new Date(booking.timeSlot.startAt)
  const endAt = new Date(booking.timeSlot.endAt)
  const createdAt = new Date(booking.createdAt)
  const isCancelled = booking.status === 'CANCELLED'

  return (
    <motion.article
      className={`booking-card booking-card-v2${isCancelled ? ' booking-card-cancelled' : ''}${
        wasJustCancelled ? ' booking-card-just-cancelled' : ''
      }`}
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.42,
        delay: reduceMotion ? 0 : Math.min(index * 0.055, 0.3),
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={reduceMotion || isCancelled ? undefined : { y: -2 }}
    >
      <div className="booking-card-v2-header">
        <div className="booking-service-mark" aria-hidden="true">
          {booking.service.name.charAt(0).toUpperCase()}
        </div>
        <div className="booking-card-title">
          <span>{booking.service.durationMinutes} minute session</span>
          <h2>{booking.service.name}</h2>
          <p>{formatPrice(booking.service.priceCents)}</p>
        </div>
        <motion.span
          className={`status-pill status-${booking.status.toLowerCase()}`}
          key={booking.status}
          initial={reduceMotion ? false : { opacity: 0.6, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          {formatStatus(booking.status)}
        </motion.span>
      </div>

      <dl className="booking-details-v2">
        <div><dt>Date</dt><dd>{formatDate(startAt)}</dd></div>
        <div><dt>Time</dt><dd>{formatTime(startAt)} - {formatTime(endAt)}</dd></div>
        <div>
          <dt>Session</dt>
          <dd>{booking.timeSlot.capacity > 1 ? `Group capacity ${booking.timeSlot.capacity}` : 'Private session'}</dd>
        </div>
        <div><dt>Booked on</dt><dd>{formatDate(createdAt)}</dd></div>
      </dl>

      {booking.notes ? (
        <p className="booking-notes-v2"><strong>Notes</strong>{booking.notes}</p>
      ) : null}

      <div className="booking-card-v2-footer">
        <span>Booking ID {booking.id.slice(-8).toUpperCase()}</span>
        {!isCancelled ? (
          <button
            className="button booking-cancel-button"
            type="button"
            onClick={onCancel}
            disabled={isCancellationBusy}
            aria-label={`Cancel ${booking.service.name} on ${formatDate(startAt)}`}
          >
            {isCancelling ? 'Cancelling this booking...' : 'Cancel booking'}
          </button>
        ) : (
          <span className="cancelled-note">This booking no longer holds a place.</span>
        )}
      </div>
    </motion.article>
  )
}

function BookingsSkeleton() {
  return (
    <div className="bookings-skeleton" aria-label="Loading bookings" aria-busy="true">
      <div className="bookings-summary-v2">
        {[0, 1, 2, 3].map((item) => <span className="skeleton" key={item} />)}
      </div>
      {[0, 1, 2].map((item) => (
        <div className="booking-card-skeleton" key={item}>
          <span className="skeleton skeleton-booking-title" />
          <span className="skeleton skeleton-booking-line" />
          <span className="skeleton skeleton-booking-line skeleton-booking-short" />
        </div>
      ))}
      <span className="sr-only">Loading bookings</span>
    </div>
  )
}

function formatStatus(status: BookingFilter) {
  return status.charAt(0) + status.slice(1).toLowerCase()
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
