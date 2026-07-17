import { Link } from 'react-router-dom'
import type { Service } from '../api/servicesApi'

type ServiceCardProps = {
  service: Service
}

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <article className="service-card">
      <div className="service-card-top">
        <span className="service-initial" aria-hidden="true">
          {service.name.charAt(0).toUpperCase()}
        </span>
        <span className="meta-badge">Online booking</span>
      </div>
      <div className="service-card-content">
        <h2>{service.name}</h2>
        <p className="card-description">
          {service.description || 'No description provided yet.'}
        </p>
      </div>

      <div className="service-meta">
        <span>{service.durationMinutes} min</span>
        <span>{formatPrice(service.priceCents)}</span>
      </div>

      <Link className="button primary service-card-action" to={`/services/${service.id}`}>
        View available times <span aria-hidden="true">→</span>
      </Link>
    </article>
  )
}

export function formatPrice(priceCents: number | null) {
  if (priceCents === null) {
    return 'Price on request'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'AUD',
  }).format(priceCents / 100)
}
