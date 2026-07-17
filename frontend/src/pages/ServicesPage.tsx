import { isAxiosError } from 'axios'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
        {!isLoading && !error ? (
          <span className="page-count">{services.length} active services</span>
        ) : null}
      </section>

      <section className="two-column-layout">
        <aside className="side-panel">
          <p className="eyebrow">Find a service</p>
          <h2>Pick the appointment type that fits.</h2>
          <p>
            Compare the appointment options below, then choose a time slot that
            works for you.
          </p>
          <ol className="booking-process-list">
            <li><span>1</span> Choose a service</li>
            <li><span>2</span> View open times</li>
            <li><span>3</span> Log in to book</li>
          </ol>
          <div className="side-panel-facts">
            <span>{services.length} active services</span>
            <span>Online booking</span>
            <span>Rule-grounded assistant</span>
          </div>
        </aside>

        <div className="content-panel">
          {isLoading ? <p className="state-message">Loading services...</p> : null}
          {error ? <p className="error-message">{error}</p> : null}
          {!isLoading && !error && services.length === 0 ? (
            <div className="empty-services-state">
              <p className="state-message">
                No active services are available yet. Try the assistant for help
                or check back after the schedule is updated.
              </p>
              <Link className="button secondary empty-state-action" to="/assistant">
                Ask the assistant
              </Link>
            </div>
          ) : null}

          {!isLoading && !error && services.length > 0 ? (
            <section className="services-grid" aria-label="Services">
              {services.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </section>
          ) : null}
        </div>
      </section>
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
