import { isAxiosError } from 'axios'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getServices, type Service } from '../api/servicesApi'
import { Reveal } from '../components/Reveal'
import { ServiceCard } from '../components/ServiceCard'
import '../booking-v2.css'

export function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let isMounted = true

    async function loadServices() {
      setIsLoading(true)
      setError('')

      try {
        const data = await getServices()

        if (isMounted) {
          setServices(data)
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(getErrorMessage(caughtError, 'Could not load services'))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadServices()

    return () => {
      isMounted = false
    }
  }, [reloadKey])

  return (
    <main className="page services-page services-v2-page">
      <Reveal>
        <section className="services-v2-hero">
          <div>
            <p className="eyebrow">Services</p>
            <h1>Find the right session</h1>
            <p className="lede">
              Browse available services, compare session details, and choose a
              time that works for you.
            </p>
          </div>

          <div className="services-v2-guide" aria-label="Booking steps">
            <span><strong>01</strong> Choose a service</span>
            <span><strong>02</strong> Select a time</span>
            <span><strong>03</strong> Confirm your booking</span>
          </div>
        </section>
      </Reveal>

      <section className="services-v2-catalog" aria-labelledby="service-catalog-title">
        <div className="services-v2-catalog-heading">
          <div>
            <p className="eyebrow">Book online</p>
            <h2 id="service-catalog-title">Available services</h2>
          </div>
          {!isLoading && !error ? (
            <span className="page-count">
              {services.length} active {services.length === 1 ? 'service' : 'services'}
            </span>
          ) : null}
        </div>

        {isLoading ? <ServicesSkeleton /> : null}

        {!isLoading && error ? (
          <div className="booking-state-card booking-error-state" role="alert">
            <span className="state-icon" aria-hidden="true">!</span>
            <div>
              <h2>Services could not be loaded</h2>
              <p>{error}</p>
            </div>
            <button
              className="button secondary"
              type="button"
              onClick={() => setReloadKey((current) => current + 1)}
            >
              Try again
            </button>
          </div>
        ) : null}

        {!isLoading && !error && services.length === 0 ? (
          <div className="booking-state-card booking-empty-state">
            <span className="state-icon" aria-hidden="true">0</span>
            <div>
              <h2>No services are available right now</h2>
              <p>
                The schedule may still be taking shape. Ask the assistant for
                help or check back soon.
              </p>
            </div>
            <Link className="button secondary" to="/assistant">
              Ask the assistant
            </Link>
          </div>
        ) : null}

        {!isLoading && !error && services.length > 0 ? (
          <section className="services-grid services-v2-grid" aria-label="Services">
            {services.map((service, index) => (
              <ServiceCard key={service.id} service={service} index={index} />
            ))}
          </section>
        ) : null}
      </section>
    </main>
  )
}

function ServicesSkeleton() {
  return (
    <div className="services-grid services-v2-grid" aria-label="Loading services" aria-busy="true">
      {[0, 1, 2, 3].map((item) => (
        <div className="service-skeleton" key={item} aria-hidden="true">
          <span className="skeleton skeleton-square" />
          <span className="skeleton skeleton-title" />
          <span className="skeleton skeleton-line" />
          <span className="skeleton skeleton-line skeleton-line-short" />
          <span className="skeleton skeleton-button" />
        </div>
      ))}
      <span className="sr-only">Loading services</span>
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
