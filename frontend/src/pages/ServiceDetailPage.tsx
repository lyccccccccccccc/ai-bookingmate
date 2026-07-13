import { isAxiosError } from 'axios'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createBooking } from '../api/bookingsApi'
import {
  getAvailableTimeSlots,
  getServiceById,
  type Service,
  type TimeSlot,
} from '../api/servicesApi'
import { useAuth } from '../auth/AuthContext'
import { formatPrice } from '../components/ServiceCard'
import { TimeSlotCard } from '../components/TimeSlotCard'

export function ServiceDetailPage() {
  const { serviceId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [service, setService] = useState<Service | null>(null)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [bookingMessage, setBookingMessage] = useState('')
  const [bookingError, setBookingError] = useState('')
  const [bookingTimeSlotId, setBookingTimeSlotId] = useState<string | null>(
    null,
  )

  async function loadAvailableTimeSlots(currentServiceId: string) {
    const timeSlotData = await getAvailableTimeSlots(currentServiceId)
    setTimeSlots(timeSlotData)
  }

  useEffect(() => {
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

        setService(serviceData)
        setTimeSlots(timeSlotData)
      } catch (caughtError) {
        setError(getErrorMessage(caughtError, 'Could not load service details'))
      } finally {
        setIsLoading(false)
      }
    }

    void loadServiceDetails()
  }, [serviceId])

  async function handleBookTimeSlot(timeSlotId: string) {
    if (!serviceId) {
      return
    }

    setBookingMessage('')
    setBookingError('')
    setBookingTimeSlotId(timeSlotId)

    try {
      await createBooking(timeSlotId, 'Booked from frontend')
      setBookingMessage('Booking created successfully.')
      navigate('/my-bookings')
    } catch (caughtError) {
      if (isAxiosError(caughtError) && caughtError.response?.status === 409) {
        setBookingError(
          'This time slot has already been booked. Please choose another time.',
        )
        await loadAvailableTimeSlots(serviceId)
      } else {
        setBookingError(getErrorMessage(caughtError, 'Could not create booking'))
      }
    } finally {
      setBookingTimeSlotId(null)
    }
  }

  return (
    <main className="page service-detail-page">
      <Link className="back-link" to="/services">
        Back to services
      </Link>

      {isLoading ? <p className="state-message">Loading service...</p> : null}
      {error ? <p className="error-message">{error}</p> : null}
      {bookingMessage ? <p className="success-message">{bookingMessage}</p> : null}
      {bookingError ? <p className="error-message">{bookingError}</p> : null}

      {!isLoading && !error && service ? (
        <>
          <section className="service-detail-panel">
            <p className="eyebrow">Service details</p>
            <h1>{service.name}</h1>
            <p className="lede">
              {service.description || 'No description provided yet.'}
            </p>
            <div className="service-meta detail-meta">
              <span>{service.durationMinutes} minutes</span>
              <span>{formatPrice(service.priceCents)}</span>
            </div>
          </section>

          <section className="time-slots-section">
            <div className="section-heading">
              <h2>Available time slots</h2>
              <p>Choose an available time to create your booking.</p>
            </div>

            {timeSlots.length === 0 ? (
              <p className="state-message">
                No available time slots for this service yet.
              </p>
            ) : (
              <div className="time-slots-list">
                {timeSlots.map((timeSlot) => (
                  <TimeSlotCard
                    key={timeSlot.id}
                    timeSlot={timeSlot}
                    action={
                      user ? (
                        <button
                          className="button primary"
                          type="button"
                          onClick={() => void handleBookTimeSlot(timeSlot.id)}
                          disabled={bookingTimeSlotId === timeSlot.id}
                        >
                          {bookingTimeSlotId === timeSlot.id
                            ? 'Booking...'
                            : 'Book this time'}
                        </button>
                      ) : (
                        <Link className="button secondary" to="/login">
                          Log in to book
                        </Link>
                      )
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
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
