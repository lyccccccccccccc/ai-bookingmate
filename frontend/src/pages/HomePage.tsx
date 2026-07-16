import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function HomePage() {
  const { user } = useAuth()

  return (
    <main className="page home-page">
      <section className="hero-section">
        <p className="eyebrow">Service booking, made calmer</p>
        <h1>AI BookingMate</h1>
        <p className="lede">
          A polished booking workspace for small service businesses, with
          customer scheduling, admin controls, and a business-rule grounded AI
          assistant.
        </p>

        <div className="button-row">
          {user ? (
            <>
              <Link className="button primary" to="/services">
                Browse Services
              </Link>
              <Link className="button secondary" to="/dashboard">
                Go to Dashboard
              </Link>
              <Link className="button secondary" to="/assistant">
                Ask Assistant
              </Link>
            </>
          ) : (
            <>
              <Link className="button primary" to="/services">
                Browse Services
              </Link>
              <Link className="button secondary" to="/login">
                Login
              </Link>
              <Link className="button secondary" to="/assistant">
                Ask Assistant
              </Link>
            </>
          )}
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
      </section>
    </main>
  )
}
