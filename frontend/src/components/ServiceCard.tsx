import { Link } from 'react-router-dom'
import type { Service } from '../api/servicesApi'

type ServiceCardProps = {
  service: Service
}

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <article className="service-card">
      <div>
        <h2>{service.name}</h2>
        <p className="card-description">
          {service.description || 'No description provided yet.'}
        </p>
      </div>

      <div className="service-meta">
        <span>{service.durationMinutes} minutes</span>
        <span>{formatPrice(service.priceCents)}</span>
      </div>

      <Link className="button primary" to={`/services/${service.id}`}>
        View available times
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
