import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function HomePage() {
  const { user } = useAuth()

  return (
    <main className="page home-page">
      <section className="page-hero hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Service booking, made calmer</p>
          <h1>Run bookings, availability, and customer support in one place.</h1>
          <p className="lede">
            AI BookingMate is a booking workspace for small service
            businesses, with customer scheduling, admin controls, and an
            assistant grounded in business rules.
          </p>

          <div className="button-row">
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
          </div>
          <p className="hero-note">
            Built around the booking flow your customers actually use, with
            admin controls and rule-grounded support in the same workspace.
          </p>
        </div>

        <aside className="demo-preview-card" aria-label="Product preview">
          <div className="preview-card-header">
            <div>
              <span className="preview-kicker">Workspace preview</span>
              <strong>Booking overview</strong>
            </div>
            <span className="status-badge status-confirmed">Live flow</span>
          </div>
          <div className="preview-appointment">
            <div>
              <strong>Private Tennis Lesson</strong>
              <span>Tue, 9:00 AM - 10:00 AM</span>
            </div>
            <span className="status-badge status-pending">Pending</span>
          </div>
          <div className="preview-appointment">
            <div>
              <strong>Group Tennis Lesson</strong>
              <span>Wed, 10:30 AM - 12:00 PM</span>
            </div>
            <span className="status-badge status-confirmed">Confirmed</span>
          </div>
          <div className="preview-status-grid">
            <div>
              <span>Next available</span>
              <strong>3 open slots</strong>
              <em className="status-badge status-available">Available</em>
            </div>
            <div>
              <span>Assistant context</span>
              <strong>Rules ready</strong>
              <em className="status-badge status-booked">Grounded</em>
            </div>
          </div>
        </aside>
      </section>

      <section className="page-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">How it works</p>
            <h2>Simple flow for customers and admins</h2>
          </div>
        </div>
        <div className="feature-grid">
          <article className="action-card workflow-step">
            <span className="feature-icon">1</span>
            <h3>Customers browse services</h3>
            <p>Active services show duration, price, and a path to available times.</p>
          </article>
          <article className="action-card workflow-step">
            <span className="feature-icon">2</span>
            <h3>Select an available time</h3>
            <p>Logged-in customers choose an open slot and create a booking securely.</p>
          </article>
          <article className="action-card workflow-step">
            <span className="feature-icon">3</span>
            <h3>Manage or confirm bookings</h3>
            <p>Customers manage their appointments while admins keep operations on track.</p>
          </article>
        </div>
      </section>

      <section className="feature-grid" aria-label="AI BookingMate features">
        <article className="feature-card">
          <span className="feature-icon">01</span>
          <h2>Online booking</h2>
          <p>
            Customers can browse active services, choose available time slots,
            and manage their own bookings after logging in.
          </p>
        </article>

        <article className="feature-card">
          <span className="feature-icon">02</span>
          <h2>Admin scheduling</h2>
          <p>
            Admins can manage services, time slots, bookings, and the rules
            that shape customer support answers.
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
          <h2>OpenAI assistant</h2>
          <p>
            OpenAI mode stays backend-only and uses retrieved business context
            before generating customer-friendly answers.
          </p>
        </article>
      </section>

      <section className="customer-admin-grid" aria-label="Product capabilities">
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
      </section>
    </main>
  )
}
