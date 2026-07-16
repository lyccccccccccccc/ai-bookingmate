import { isAxiosError } from 'axios'
import { useEffect, useState } from 'react'
import { getServices, type Service } from '../api/servicesApi'
import { ServiceCard } from '../components/ServiceCard'

export function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadServices() {
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
  }, [])

  return (
    <main className="page services-page">
      <section className="page-header">
        <p className="eyebrow">Browse services</p>
        <h1>Available Services</h1>
        <p className="lede">
          Choose a service, review the duration and price, then pick an
          available time that fits your schedule.
        </p>
      </section>

      {isLoading ? <p className="state-message">Loading services...</p> : null}
      {error ? <p className="error-message">{error}</p> : null}
      {!isLoading && !error && services.length === 0 ? (
        <p className="state-message">No active services are available yet.</p>
      ) : null}

      {!isLoading && !error && services.length > 0 ? (
        <section className="services-grid" aria-label="Services">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </section>
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
