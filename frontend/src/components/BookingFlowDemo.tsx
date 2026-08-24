import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'

const DEMO_STEP_DURATION_MS = 1800

export function BookingFlowDemo() {
  const reduceMotion = useReducedMotion()
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (reduceMotion) {
      setStep(3)
      return
    }

    const interval = window.setInterval(() => {
      setStep((currentStep) => (currentStep + 1) % 4)
    }, DEMO_STEP_DURATION_MS)

    return () => window.clearInterval(interval)
  }, [reduceMotion])

  const capacity = step >= 2 ? 5 : 4
  const isConfirmed = step >= 3

  return (
    <motion.aside
      className="booking-flow-demo"
      aria-label="Animated booking workflow preview"
      initial={reduceMotion ? false : { opacity: 0, scale: 0.97, x: 18 }}
      animate={
        reduceMotion
          ? { opacity: 1 }
          : { opacity: 1, scale: 1, x: 0, y: [0, -3, 0] }
      }
      transition={{
        opacity: { delay: 0.32, duration: 0.55 },
        scale: { delay: 0.32, duration: 0.55 },
        x: { delay: 0.32, duration: 0.55 },
        y: { delay: 1, duration: 5.8, repeat: Infinity, ease: 'easeInOut' },
      }}
    >
      <div className="demo-window-bar">
        <div className="demo-window-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <span>Today&apos;s bookings</span>
        <span className="demo-live-indicator">Live</span>
      </div>

      <div className="demo-summary-row">
        <div>
          <span className="demo-label">Wednesday schedule</span>
          <strong>Two sessions</strong>
        </div>
        <span className="demo-date-chip">Aug 26</span>
      </div>

      <div className="demo-booking-list">
        <article className="demo-booking-card">
          <div className="demo-time-block">
            <strong>9:00</strong>
            <span>60 min</span>
          </div>
          <div className="demo-booking-copy">
            <strong>Private Tennis Lesson</strong>
            <span>Tue, 9:00 AM - 10:00 AM</span>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isConfirmed ? 'confirmed' : 'pending'}
              className={`demo-status ${isConfirmed ? 'is-confirmed' : 'is-pending'}`}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.25 }}
            >
              {isConfirmed ? 'Confirmed' : 'Pending'}
            </motion.span>
          </AnimatePresence>
        </article>

        <article className={`demo-booking-card demo-group-card ${step === 1 ? 'is-incoming' : ''}`}>
          <div className="demo-time-block">
            <strong>10:30</strong>
            <span>90 min</span>
          </div>
          <div className="demo-booking-copy">
            <strong>Adult Group Tennis</strong>
            <span>Wed, 10:30 AM - 12:00 PM</span>
          </div>
          <span className="demo-status is-available">Available</span>
        </article>
      </div>

      <div className="demo-capacity-panel">
        <div className="demo-capacity-heading">
          <div>
            <span className="demo-label">Group capacity</span>
            <strong>{capacity} of 6 spots</strong>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={capacity}
              className="demo-capacity-count"
              initial={reduceMotion ? false : { opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -5 }}
            >
              {6 - capacity} left
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="demo-progress-track" aria-hidden="true">
          <motion.span
            animate={{ scaleX: capacity / 6 }}
            initial={false}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease: 'easeOut' }}
          />
        </div>
        <AnimatePresence>
          {step === 1 ? (
            <motion.div
              className="demo-incoming"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
            >
              <span aria-hidden="true" /> Booking incoming
            </motion.div>
          ) : null}
          {isConfirmed ? (
            <motion.div
              className="demo-success"
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
            >
              <span aria-hidden="true" /> Booking confirmed and capacity updated
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.aside>
  )
}
