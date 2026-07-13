import { isAxiosError } from 'axios'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  getAvailableTimeSlots,
  getServiceById,
  type Service,
  type TimeSlot,
} from '../api/servicesApi'
import { formatPrice } from '../components/ServiceCard'
import { TimeSlotCard } from '../components/TimeSlotCard'

export function ServiceDetailPage() {
  const { serviceId } = useParams()
  const [service, setService] = useState<Service | null>(null)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

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

  return (
    <main className="page service-detail-page">
      <Link className="back-link" to="/services">
        Back to services
      </Link>

      {isLoading ? <p className="state-message">Loading service...</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

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
              <p>Booking buttons are placeholders until Day 10.</p>
            </div>

            {timeSlots.length === 0 ? (
              <p className="state-message">
                No available time slots for this service yet.
              </p>
            ) : (
              <div className="time-slots-list">
                {timeSlots.map((timeSlot) => (
                  <TimeSlotCard key={timeSlot.id} timeSlot={timeSlot} />
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
