import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import type { Service } from '../api/servicesApi'

type ServiceCardProps = {
  service: Service
  index?: number
}

export function ServiceCard({ service, index = 0 }: ServiceCardProps) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.article
      className="service-card booking-service-card"
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay: reduceMotion ? 0 : Math.min(index * 0.07, 0.35),
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={reduceMotion ? undefined : { y: -3 }}
    >
      <div className="service-card-top">
        <span className="service-initial" aria-hidden="true">
          {service.name.charAt(0).toUpperCase()}
        </span>
        <span className="availability-badge">
          <span aria-hidden="true" /> Online booking
        </span>
      </div>

      <div className="service-card-content">
        <h2>{service.name}</h2>
        <p className="card-description">
          {service.description || 'No description provided yet.'}
        </p>
      </div>

      <div className="service-meta">
        <span>
          <small>Duration</small>
          {service.durationMinutes} min
        </span>
        <span>
          <small>Price</small>
          {formatPrice(service.priceCents)}
        </span>
      </div>

      <Link
        className="button primary service-card-action"
        to={`/services/${service.id}`}
      >
        View available times <span className="button-arrow" aria-hidden="true" />
      </Link>
    </motion.article>
  )
}

export function formatPrice(priceCents: number | null) {
  if (priceCents === null) {
    return 'Price on request'
  }

  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(priceCents / 100)
}
