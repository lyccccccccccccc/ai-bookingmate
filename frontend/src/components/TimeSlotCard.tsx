import type { ReactNode } from 'react'
import type { TimeSlot } from '../api/servicesApi'

type TimeSlotCardProps = {
  timeSlot: TimeSlot
  action?: ReactNode
  isSelected?: boolean
}

export function TimeSlotCard({
  timeSlot,
  action,
  isSelected = false,
}: TimeSlotCardProps) {
  const startAt = new Date(timeSlot.startAt)
  const endAt = new Date(timeSlot.endAt)
  const occupiedPercentage = Math.min(
    100,
    Math.max(0, (timeSlot.activeBookingCount / timeSlot.capacity) * 100),
  )

  return (
    <article
      className={`time-slot-card booking-slot-card${
        isSelected ? ' booking-slot-selected' : ''
      }${timeSlot.isFull ? ' booking-slot-full' : ''}`}
    >
      <div className="slot-date-block">
        <p className="slot-date">{formatDate(startAt)}</p>
        <p className="slot-time">
          {formatTime(startAt)} <span aria-hidden="true">-</span>{' '}
          {formatTime(endAt)}
        </p>
      </div>

      <div className="slot-capacity" aria-label={getAvailabilityLabel(timeSlot)}>
        <div className="slot-capacity-heading">
          <span>{getAvailabilityLabel(timeSlot)}</span>
          <small>
            {timeSlot.activeBookingCount}/{timeSlot.capacity} booked
          </small>
        </div>
        <span className="capacity-track" aria-hidden="true">
          <span style={{ width: `${occupiedPercentage}%` }} />
        </span>
      </div>

      <span
        className={`status-pill status-${timeSlot.status.toLowerCase()}`}
      >
        {timeSlot.isFull
          ? 'Fully booked'
          : `${timeSlot.remainingSpots} ${
              timeSlot.remainingSpots === 1 ? 'spot' : 'spots'
            } left`}
      </span>

      {isSelected ? (
        <span className="slot-selected-mark" aria-label="Selected">
          <span aria-hidden="true" /> Selected
        </span>
      ) : null}

      {action ? <div className="slot-action">{action}</div> : null}
    </article>
  )
}

function getAvailabilityLabel(timeSlot: TimeSlot) {
  if (timeSlot.isFull) {
    return 'No places available'
  }

  if (timeSlot.capacity === 1) {
    return 'Private appointment'
  }

  return `${timeSlot.remainingSpots} of ${timeSlot.capacity} places available`
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function formatTime(date: Date) {
  return new Intl.DateTimeFormat('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}
