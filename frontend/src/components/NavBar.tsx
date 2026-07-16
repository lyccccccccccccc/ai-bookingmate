import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function NavBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <header className="navbar">
      <Link className="brand" to="/">
        AI BookingMate
      </Link>

      <nav className="nav-links" aria-label="Main navigation">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/services">Services</NavLink>
        <NavLink to="/assistant">Assistant</NavLink>
        {user ? (
          <>
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/my-bookings">My Bookings</NavLink>
            {user.role === 'ADMIN' ? (
              <>
                <NavLink to="/admin/bookings">Admin Bookings</NavLink>
                <NavLink to="/admin/business-rules">Admin Rules</NavLink>
                <NavLink to="/admin/services">Admin Services</NavLink>
                <NavLink to="/admin/time-slots">Admin Time Slots</NavLink>
              </>
            ) : null}
            <button type="button" className="link-button" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login">Login</NavLink>
            <NavLink to="/register">Register</NavLink>
          </>
        )}
      </nav>
    </header>
  )
}
