import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function NavBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    function updateNavbar() {
      setIsScrolled(window.scrollY > 10)
    }

    updateNavbar()
    window.addEventListener('scroll', updateNavbar, { passive: true })

    return () => window.removeEventListener('scroll', updateNavbar)
  }, [])

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <motion.header
      className={`navbar ${isScrolled ? 'navbar-scrolled' : ''}`}
      initial={reduceMotion ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <Link className="brand" to="/">
        AI BookingMate
      </Link>

      <nav className="nav-links" aria-label="Main navigation">
        <span className="nav-group">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/services">Services</NavLink>
          <NavLink to="/assistant">Assistant</NavLink>
        </span>
        {user ? (
          <>
            <span className="nav-group">
              <NavLink to="/dashboard">Dashboard</NavLink>
              <NavLink to="/my-bookings">My Bookings</NavLink>
            </span>
            {user.role === 'ADMIN' ? (
              <span className="nav-group admin-nav-group" aria-label="Admin navigation">
                <NavLink to="/admin/bookings">Admin Bookings</NavLink>
                <NavLink to="/admin/business-rules">Admin Rules</NavLink>
                <NavLink to="/admin/services">Admin Services</NavLink>
                <NavLink to="/admin/time-slots">Admin Time Slots</NavLink>
              </span>
            ) : null}
            <button type="button" className="link-button" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <span className="nav-group">
            <NavLink to="/login">Login</NavLink>
            <NavLink to="/register">Register</NavLink>
          </span>
        )}
      </nav>
    </motion.header>
  )
}
