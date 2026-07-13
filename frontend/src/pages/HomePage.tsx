import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function HomePage() {
  const { user } = useAuth()

  return (
    <main className="page home-page">
      <section className="hero-section">
        <p className="eyebrow">Simple booking software</p>
        <h1>AI BookingMate</h1>
        <p className="lede">
          A booking platform for small service businesses, with authentication,
          services, time slots, and booking foundations already in place.
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
            </>
          ) : (
            <>
              <Link className="button primary" to="/services">
                Browse Services
              </Link>
              <Link className="button secondary" to="/login">
                Login
              </Link>
              <Link className="button secondary" to="/register">
                Register
              </Link>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
