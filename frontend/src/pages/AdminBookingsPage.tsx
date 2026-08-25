import { isAxiosError } from 'axios'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import {
  getAllBookings,
  updateBookingStatus,
  type AdminBooking,
} from '../api/adminBookingsApi'
import type { BookingStatus } from '../api/bookingsApi'
import {
  AdminEmptyState,
  AdminFeedback,
  AdminListSkeleton,
  AdminPageHeader,
} from '../components/admin/AdminWorkspace'
import { formatDate, formatTime } from '../components/TimeSlotCard'
import '../admin-v2.css'

type StatusFilter = 'ALL' | BookingStatus

const statusOptions: StatusFilter[] = ['ALL', 'PENDING', 'CONFIRMED', 'CANCELLED']

export function AdminBookingsPage() {
  const [bookings, setBookings] = useState<AdminBooking[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null)

  async function loadBookings(filter: StatusFilter) {
    setError('')
    const data = await getAllBookings(filter === 'ALL' ? {} : { status: filter })
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
    <main className="page admin-bookings-page admin-v2-page">
      <AdminPageHeader
        title="Bookings"
        description="Review customer bookings and manage their status."
        action={!isLoading ? <span className="admin-count-badge">{bookings.length} shown</span> : undefined}
      />

      <AdminFeedback message={message} error={error} />

      <section className="admin-v2-controls" aria-label="Booking filters">
        <div>
          <span>Booking status</span>
          <div className="admin-segmented-control">
            {statusOptions.map((status) => (
              <button
                className={statusFilter === status ? 'active' : ''}
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                aria-pressed={statusFilter === status}
                disabled={isLoading || updatingBookingId !== null}
              >
                {formatStatus(status)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {isLoading ? <AdminListSkeleton rows={4} /> : null}

      {!isLoading && !error && bookings.length === 0 ? (
        <AdminEmptyState
          title="No bookings match these filters"
          description="Choose another status to review the rest of the booking queue."
        />
      ) : null}

      {!isLoading && bookings.length > 0 ? (
        <section className="admin-v2-list" aria-label="Admin bookings">
          {bookings.map((booking, index) => (
            <AdminBookingRow
              key={booking.id}
              booking={booking}
              index={index}
              isUpdating={updatingBookingId === booking.id}
              isAnyUpdating={updatingBookingId !== null}
              onConfirm={() => void handleStatusUpdate(booking.id, 'CONFIRMED')}
              onCancel={() => void handleStatusUpdate(booking.id, 'CANCELLED')}
            />
          ))}
        </section>
      ) : null}
    </main>
  )
}

function AdminBookingRow({
  booking,
  index,
  isUpdating,
  isAnyUpdating,
  onConfirm,
  onCancel,
}: {
  booking: AdminBooking
  index: number
  isUpdating: boolean
  isAnyUpdating: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const reduceMotion = useReducedMotion()
  const startAt = new Date(booking.timeSlot.startAt)
  const endAt = new Date(booking.timeSlot.endAt)

  return (
    <motion.article
      className={`admin-booking-row admin-row-${booking.status.toLowerCase()}`}
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, delay: reduceMotion ? 0 : Math.min(index * 0.04, 0.24) }}
    >
      <div className="admin-booking-primary">
        <span className="admin-record-mark" aria-hidden="true">
          {booking.service.name.charAt(0).toUpperCase()}
        </span>
        <div>
          <span>{booking.customer.name}</span>
          <h2>{booking.service.name}</h2>
          <small>{booking.customer.email}</small>
        </div>
      </div>

      <dl className="admin-booking-facts">
        <div><dt>Date</dt><dd>{formatDate(startAt)}</dd></div>
        <div><dt>Time</dt><dd>{formatTime(startAt)} - {formatTime(endAt)}</dd></div>
        <div>
          <dt>Session</dt>
          <dd>{booking.timeSlot.capacity > 1 ? `Group, capacity ${booking.timeSlot.capacity}` : 'Private, capacity 1'}</dd>
        </div>
      </dl>

      <motion.span
        className={`status-pill status-${booking.status.toLowerCase()}`}
        key={booking.status}
        initial={reduceMotion ? false : { opacity: 0.65 }}
        animate={{ opacity: 1 }}
      >
        {formatStatus(booking.status)}
      </motion.span>

      {booking.notes ? <p className="admin-booking-notes"><strong>Notes</strong>{booking.notes}</p> : null}

      <div className="admin-row-footer">
        <span>#{booking.id.slice(-8).toUpperCase()}</span>
        <div className="admin-row-actions">
          {booking.status === 'PENDING' ? (
            <button
              className="button primary admin-compact-button"
              type="button"
              onClick={onConfirm}
              disabled={isAnyUpdating}
            >
              {isUpdating ? 'Updating...' : 'Confirm'}
            </button>
          ) : null}
          {booking.status !== 'CANCELLED' ? (
            <button
              className="button admin-danger-outline admin-compact-button"
              type="button"
              onClick={onCancel}
              disabled={isAnyUpdating}
            >
              {isUpdating ? 'Updating...' : 'Cancel'}
            </button>
          ) : null}
        </div>
      </div>
    </motion.article>
  )
}

function formatStatus(status: StatusFilter) {
  return status.charAt(0) + status.slice(1).toLowerCase()
}

function getErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message
    if (Array.isArray(message)) return message.join(', ')
    if (message) return message
  }
  return fallback
}
