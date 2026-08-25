import { isAxiosError } from 'axios'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { createBooking } from '../api/bookingsApi'
import {
  getAvailableTimeSlots,
  getServiceById,
  type Service,
  type TimeSlot,
} from '../api/servicesApi'
import { useAuth } from '../auth/AuthContext'
import { Reveal } from '../components/Reveal'
import { formatPrice } from '../components/ServiceCard'
import { formatDate, formatTime, TimeSlotCard } from '../components/TimeSlotCard'
import '../booking-v2.css'

export function ServiceDetailPage() {
  const { serviceId } = useParams()
  const { user } = useAuth()
  const [service, setService] = useState<Service | null>(null)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [bookingMessage, setBookingMessage] = useState('')
  const [bookingError, setBookingError] = useState('')
  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState<string | null>(null)
  const [isBooking, setIsBooking] = useState(false)

  const selectedTimeSlot = useMemo(
    () => timeSlots.find((timeSlot) => timeSlot.id === selectedTimeSlotId) ?? null,
    [selectedTimeSlotId, timeSlots],
  )

  async function loadAvailableTimeSlots(currentServiceId: string) {
    const timeSlotData = await getAvailableTimeSlots(currentServiceId)
    setTimeSlots(timeSlotData)
  }

  useEffect(() => {
    let isMounted = true

    async function loadServiceDetails() {
      if (!serviceId) {
        setError('Service id is missing')
        setIsLoading(false)
        return
      }

      try {
        const [serviceData, timeSlotData] = await Promise.all([
          getServiceById(serviceId),
          getAvailableTimeSlots(serviceId),
        ])

        if (isMounted) {
          setService(serviceData)
          setTimeSlots(timeSlotData)
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(getErrorMessage(caughtError, 'Could not load service details'))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadServiceDetails()

    return () => {
      isMounted = false
    }
  }, [serviceId])

  function handleSelectTimeSlot(timeSlotId: string) {
    if (isBooking) {
      return
    }

    setBookingMessage('')
    setBookingError('')
    setSelectedTimeSlotId(timeSlotId)
  }

  async function handleCreateBooking() {
    if (!serviceId || !selectedTimeSlot || isBooking) {
      return
    }

    const bookedStartAt = new Date(selectedTimeSlot.startAt)
    setBookingMessage('')
    setBookingError('')
    setIsBooking(true)

    try {
      await createBooking(selectedTimeSlot.id, 'Booked from frontend')
      setBookingMessage(
        `${formatDate(bookedStartAt)} at ${formatTime(bookedStartAt)}`,
      )
      setSelectedTimeSlotId(null)

      try {
        await loadAvailableTimeSlots(serviceId)
      } catch {
        // The booking succeeded; a later page refresh will reload availability.
      }
    } catch (caughtError) {
      if (isAxiosError(caughtError) && caughtError.response?.status === 409) {
        setBookingError(
          'This time slot is fully booked or no longer available. Please choose another time.',
        )
        setSelectedTimeSlotId(null)
        await loadAvailableTimeSlots(serviceId)
      } else {
        setBookingError(getErrorMessage(caughtError, 'Could not create booking'))
      }
    } finally {
      setIsBooking(false)
    }
  }

  return (
    <main className="page service-detail-page service-detail-v2-page">
      <Link className="back-link booking-back-link" to="/services">
        <span aria-hidden="true">&lt;-</span> Back to services
      </Link>

      {isLoading ? <ServiceDetailSkeleton /> : null}

      {!isLoading && error ? (
        <div className="booking-state-card booking-error-state" role="alert">
          <span className="state-icon" aria-hidden="true">!</span>
          <div>
            <h1>Service could not be loaded</h1>
            <p>{error}</p>
          </div>
          <Link className="button secondary" to="/services">Browse services</Link>
        </div>
      ) : null}

      {!isLoading && !error && service ? (
        <div className="service-booking-v2-layout">
          <Reveal className="service-overview-v2">
            <section aria-labelledby="service-name">
              <p className="eyebrow">Service details</p>
              <h1 id="service-name">{service.name}</h1>
              <p className="lede">
                {service.description || 'No description provided yet.'}
              </p>

              <div className="service-facts-v2">
                <div>
                  <span>Duration</span>
                  <strong>{service.durationMinutes} minutes</strong>
                </div>
                <div>
                  <span>Price</span>
                  <strong>{formatPrice(service.priceCents)}</strong>
                </div>
                <div>
                  <span>Booking</span>
                  <strong>Instant online request</strong>
                </div>
              </div>

              <div className="booking-notes-v2">
                <h2>Before you book</h2>
                <ul>
                  <li>Times are shown in your local timezone.</li>
                  <li>Your place is secured when the booking is created.</li>
                  <li>You can review or cancel from My Bookings.</li>
                </ul>
              </div>
            </section>
          </Reveal>

          <Reveal className="booking-panel-v2" delay={0.08}>
            <section aria-labelledby="availability-title">
              <div className="booking-panel-heading">
                <div>
                  <p className="eyebrow">Availability</p>
                  <h2 id="availability-title">Choose a time</h2>
                  <p>Select one available session, then confirm your booking.</p>
                </div>
                <span className="live-availability-badge">
                  <span aria-hidden="true" /> Live availability
                </span>
              </div>

              {bookingMessage ? (
                <div className="booking-success-card" role="status">
                  <span className="success-check" aria-hidden="true" />
                  <div>
                    <p className="eyebrow">Booking created</p>
                    <h3>Your session is in the diary.</h3>
                    <p>{bookingMessage}</p>
                  </div>
                  <div className="booking-success-actions">
                    <Link className="button primary" to="/my-bookings">
                      View My Bookings
                    </Link>
                    <Link className="button secondary" to="/services">
                      Browse More Services
                    </Link>
                  </div>
                </div>
              ) : null}

              {bookingError ? (
                <p className="booking-inline-error" role="alert">
                  <strong>Booking not completed.</strong> {bookingError}
                </p>
              ) : null}

              {!user ? (
                <div className="booking-login-notice">
                  <div>
                    <strong>Ready to reserve a place?</strong>
                    <p>Log in or create an account before choosing your time.</p>
                  </div>
                  <Link className="button secondary" to="/login">Log in to book</Link>
                </div>
              ) : null}

              {timeSlots.length === 0 ? (
                <div className="booking-empty-slots">
                  <span aria-hidden="true">0</span>
                  <h3>No open times just yet</h3>
                  <p>
                    New availability is added regularly. Try another service or
                    check back later.
                  </p>
                  <Link className="button secondary" to="/services">
                    View other services
                  </Link>
                </div>
              ) : (
                <div className="time-slots-list booking-slots-v2">
                  {timeSlots.map((timeSlot) => (
                    <TimeSlotCard
                      key={timeSlot.id}
                      timeSlot={timeSlot}
                      isSelected={selectedTimeSlotId === timeSlot.id}
                      action={
                        user ? (
                          <button
                            className="button slot-select-button"
                            type="button"
                            onClick={() => handleSelectTimeSlot(timeSlot.id)}
                            disabled={timeSlot.isFull || isBooking}
                            aria-pressed={selectedTimeSlotId === timeSlot.id}
                          >
                            {timeSlot.isFull
                              ? 'Unavailable'
                              : selectedTimeSlotId === timeSlot.id
                                ? 'Selected'
                                : 'Select time'}
                          </button>
                        ) : undefined
                      }
                    />
                  ))}
                </div>
              )}

              {user && timeSlots.length > 0 ? (
                <div className="booking-confirm-bar">
                  <div>
                    <span>{selectedTimeSlot ? 'Selected session' : 'Choose a session above'}</span>
                    <strong>
                      {selectedTimeSlot
                        ? `${formatDate(new Date(selectedTimeSlot.startAt))}, ${formatTime(
                            new Date(selectedTimeSlot.startAt),
                          )}`
                        : 'No time selected'}
                    </strong>
                  </div>
                  <button
                    className="button primary booking-confirm-button"
                    type="button"
                    onClick={() => void handleCreateBooking()}
                    disabled={!selectedTimeSlot || isBooking}
                  >
                    {isBooking ? 'Creating booking...' : 'Confirm booking'}
                  </button>
                </div>
              ) : null}
            </section>
          </Reveal>
        </div>
      ) : null}
    </main>
  )
}

function ServiceDetailSkeleton() {
  return (
    <div className="service-booking-v2-layout detail-skeleton" aria-label="Loading service" aria-busy="true">
      <div className="service-overview-v2">
        <span className="skeleton skeleton-label" />
        <span className="skeleton skeleton-heading" />
        <span className="skeleton skeleton-line" />
        <span className="skeleton skeleton-line skeleton-line-short" />
        <div className="skeleton-facts">
          <span className="skeleton" />
          <span className="skeleton" />
        </div>
      </div>
      <div className="booking-panel-v2">
        <span className="skeleton skeleton-label" />
        <span className="skeleton skeleton-title" />
        {[0, 1, 2].map((item) => (
          <span className="skeleton skeleton-slot" key={item} />
        ))}
      </div>
      <span className="sr-only">Loading service and available times</span>
    </div>
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
