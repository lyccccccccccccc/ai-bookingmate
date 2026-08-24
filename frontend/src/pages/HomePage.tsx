import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { BookingFlowDemo } from '../components/BookingFlowDemo'
import { Reveal } from '../components/Reveal'
import '../frontend-v2.css'

export function HomePage() {
  const { user } = useAuth()
  const reduceMotion = useReducedMotion()

  const enter = (delay: number) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: 0.5,
      delay,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  })

  const revealCard = (delay: number) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 14 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.3 },
    transition: {
      duration: 0.45,
      delay: reduceMotion ? 0 : delay,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  })

  return (
    <main className="page home-page frontend-v2-home">
      <section className="page-hero hero-section frontend-v2-hero">
        <div className="hero-copy">
          <motion.p className="eyebrow" {...enter(0.05)}>
            Service booking, made calmer
          </motion.p>
          <motion.h1 {...enter(0.12)}>
            Run bookings, availability, and customer support in one place.
          </motion.h1>
          <motion.p className="lede" {...enter(0.2)}>
            A booking workspace for service businesses with customer
            scheduling, capacity-based sessions, admin controls, and
            business-rule-grounded AI support.
          </motion.p>

          <motion.div className="button-row" {...enter(0.28)}>
            <Link className="button primary" to="/services">
              Browse Services
            </Link>
            <Link className="button secondary" to="/assistant">
              Ask Assistant
            </Link>
            {user ? (
              <Link className="button ghost" to="/dashboard">
                Open Dashboard
              </Link>
            ) : (
              <Link className="button ghost" to="/login">
                Login
              </Link>
            )}
          </motion.div>
          <motion.p className="hero-note" {...enter(0.34)}>
            Built around the booking flow your customers actually use, with
            admin controls and rule-grounded support in the same workspace.
          </motion.p>
        </div>

        <BookingFlowDemo />
      </section>

      <Reveal className="page-section home-workflow-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">How it works</p>
            <h2>Simple flow for customers and admins</h2>
          </div>
        </div>
        <div className="feature-grid workflow-grid">
          <motion.article
            className="action-card workflow-step"
            {...revealCard(0)}
            whileHover={reduceMotion ? undefined : { y: -4 }}
          >
            <span className="feature-icon">01</span>
            <h3>Browse services</h3>
            <p>Compare active services, durations, prices, and remaining capacity.</p>
          </motion.article>
          <motion.article
            className="action-card workflow-step"
            {...revealCard(0.08)}
            whileHover={reduceMotion ? undefined : { y: -4 }}
          >
            <span className="feature-icon">02</span>
            <h3>Select an available time</h3>
            <p>Choose an open private or group session and book securely.</p>
          </motion.article>
          <motion.article
            className="action-card workflow-step"
            {...revealCard(0.16)}
            whileHover={reduceMotion ? undefined : { y: -4 }}
          >
            <span className="feature-icon">03</span>
            <h3>Manage or confirm bookings</h3>
            <p>Customers stay informed while admins keep operations on track.</p>
          </motion.article>
        </div>
      </Reveal>

      <Reveal className="feature-grid home-feature-grid" delay={0.05}>
        <article className="feature-card">
          <span className="feature-icon">01</span>
          <h2>Online booking</h2>
          <p>
            Customers can browse active services, choose available time slots,
            and manage their bookings after logging in.
          </p>
        </article>
        <article className="feature-card">
          <span className="feature-icon">02</span>
          <h2>Admin scheduling</h2>
          <p>
            Admins can manage services, time slots, capacity, bookings, and the
            rules that shape customer support answers.
          </p>
        </article>
        <article className="feature-card">
          <span className="feature-icon">03</span>
          <h2>Grounded AI help</h2>
          <p>
            The assistant answers from business rules first, keeping support
            useful without inventing unsupported policies.
          </p>
        </article>
        <article className="feature-card">
          <span className="feature-icon">04</span>
          <h2>Capacity-aware sessions</h2>
          <p>
            Private and group bookings share one clear workflow with live
            remaining-place visibility and overbooking protection.
          </p>
        </article>
      </Reveal>

      <Reveal className="customer-admin-grid" delay={0.05}>
        <article className="audience-card audience-card-customer">
          <p className="eyebrow">For customers</p>
          <h2>Book with clarity.</h2>
          <ul>
            <li>Browse active services and available times.</li>
            <li>Create and cancel your own bookings.</li>
            <li>Ask questions about policies and availability.</li>
          </ul>
        </article>
        <article className="audience-card audience-card-admin">
          <p className="eyebrow">For administrators</p>
          <h2>Keep the schedule in control.</h2>
          <ul>
            <li>Create services and manage bookable time slots.</li>
            <li>Confirm or cancel customer bookings.</li>
            <li>Maintain the business rules behind assistant answers.</li>
          </ul>
        </article>
      </Reveal>
    </main>
  )
}
