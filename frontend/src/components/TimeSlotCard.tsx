import type { TimeSlot } from '../api/servicesApi'

type TimeSlotCardProps = {
  timeSlot: TimeSlot
}

export function TimeSlotCard({ timeSlot }: TimeSlotCardProps) {
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

      <span className="status-pill">{timeSlot.status}</span>

      <button className="button secondary" type="button" disabled>
        Booking coming in Day 10
      </button>
    </article>
  )
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}
