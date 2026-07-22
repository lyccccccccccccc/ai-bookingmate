import type { TimeSlot } from '../api/servicesApi'
import type { ReactNode } from 'react'

type TimeSlotCardProps = {
  timeSlot: TimeSlot
  action?: ReactNode
}

export function TimeSlotCard({ timeSlot, action }: TimeSlotCardProps) {
  const startAt = new Date(timeSlot.startAt)
  const endAt = new Date(timeSlot.endAt)

  return (
    <article className="time-slot-card">
      <div>
        <p className="slot-date">{formatDate(startAt)}</p>
        <p className="slot-time">
          {formatTime(startAt)} to {formatTime(endAt)}
        </p>
      </div>

      <span className={`status-pill status-${timeSlot.status.toLowerCase()}`}>
        {timeSlot.isFull
          ? 'Fully booked'
          : `${timeSlot.remainingSpots} ${timeSlot.remainingSpots === 1 ? 'spot' : 'spots'} remaining`}
      </span>

      {action ? <div className="slot-action">{action}</div> : null}
    </article>
  )
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
