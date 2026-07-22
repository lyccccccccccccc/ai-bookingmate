import { isAxiosError } from 'axios'
import { useEffect, useState, type FormEvent } from 'react'
import {
  createTimeSlot,
  getAdminTimeSlots,
  updateTimeSlotCapacity,
  updateTimeSlotStatus,
  type AdminTimeSlot,
  type TimeSlotStatus,
} from '../api/adminTimeSlotsApi'
import { getServices, type Service } from '../api/servicesApi'
import { formatDate, formatTime } from '../components/TimeSlotCard'

type StatusFilter = 'ALL' | TimeSlotStatus

type TimeSlotFormState = {
  serviceId: string
  startAt: string
  endAt: string
  status: 'AVAILABLE' | 'BLOCKED'
  capacity: string
}

const emptyTimeSlotForm: TimeSlotFormState = {
  serviceId: '',
  startAt: '',
  endAt: '',
  status: 'AVAILABLE',
  capacity: '1',
}

const statusFilters: StatusFilter[] = ['ALL', 'AVAILABLE', 'BOOKED', 'BLOCKED']

export function AdminTimeSlotsPage() {
  const [services, setServices] = useState<Service[]>([])
  const [timeSlots, setTimeSlots] = useState<AdminTimeSlot[]>([])
  const [serviceFilter, setServiceFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [form, setForm] = useState<TimeSlotFormState>(emptyTimeSlotForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [updatingSlotId, setUpdatingSlotId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function loadTimeSlots() {
    const data = await getAdminTimeSlots({
      serviceId: serviceFilter || undefined,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
    })
    setTimeSlots(data)
  }

  useEffect(() => {
    let isMounted = true

    async function loadServices() {
      try {
        const data = await getServices()
        if (isMounted) {
          setServices(data)
          setForm((current) => ({
            ...current,
            serviceId: current.serviceId || data[0]?.id || '',
          }))
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(getErrorMessage(caughtError, 'Could not load services'))
        }
      }
    }

    void loadServices()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadFilteredSlots() {
      setIsLoading(true)
      setMessage('')

      try {
        const data = await getAdminTimeSlots({
          serviceId: serviceFilter || undefined,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
        })

        if (isMounted) {
          setTimeSlots(data)
          setError('')
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(getErrorMessage(caughtError, 'Could not load time slots'))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadFilteredSlots()

    return () => {
      isMounted = false
    }
  }, [serviceFilter, statusFilter])

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    setMessage('')

    try {
      await createTimeSlot({
        serviceId: form.serviceId,
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        status: form.status,
        capacity: Number(form.capacity),
      })
      await loadTimeSlots()
      setForm({
        ...emptyTimeSlotForm,
        serviceId: form.serviceId || services[0]?.id || '',
      })
      setMessage('Time slot created successfully.')
    } catch (caughtError) {
      setError(getTimeSlotErrorMessage(caughtError))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleStatusUpdate(
    slot: AdminTimeSlot,
    status: 'AVAILABLE' | 'BLOCKED',
  ) {
    setUpdatingSlotId(slot.id)
    setError('')
    setMessage('')

    try {
      await updateTimeSlotStatus(slot.id, status)
      await loadTimeSlots()
      setMessage(`Time slot ${status === 'BLOCKED' ? 'blocked' : 'unblocked'}.`)
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Could not update time slot'))
    } finally {
      setUpdatingSlotId(null)
    }
  }

  async function handleCapacityUpdate(slot: AdminTimeSlot, capacity: number) {
    setUpdatingSlotId(slot.id)
    setError('')
    setMessage('')

    try {
      await updateTimeSlotCapacity(slot.id, capacity)
      await loadTimeSlots()
      setMessage('Time slot capacity updated.')
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Could not update time slot capacity'))
    } finally {
      setUpdatingSlotId(null)
    }
  }

  return (
    <main className="page admin-page">
      <section className="page-header">
        <p className="eyebrow">Admin</p>
        <h1>Admin Time Slots</h1>
        <p className="lede">
          Create availability for services and block times that should not be
          bookable.
        </p>
      </section>

      {message ? <p className="success-message">{message}</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      <section className="admin-toolbar" aria-label="Time slot filters">
        <label className="filter-label">
          Service
          <select
            value={serviceFilter}
            onChange={(event) => setServiceFilter(event.target.value)}
          >
            <option value="">All services</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-label">
          Status
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
          >
            {statusFilters.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="admin-form-section">
        <h2>Create Time Slot</h2>
        <form className="admin-form" onSubmit={handleCreate}>
          <label>
            Service
            <select
              required
              value={form.serviceId}
              onChange={(event) =>
                setForm({ ...form, serviceId: event.target.value })
              }
            >
              <option value="">Choose a service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Start time
            <input
              required
              type="datetime-local"
              value={form.startAt}
              onChange={(event) =>
                setForm({ ...form, startAt: event.target.value })
              }
            />
          </label>

          <label>
            End time
            <input
              required
              type="datetime-local"
              value={form.endAt}
              onChange={(event) =>
                setForm({ ...form, endAt: event.target.value })
              }
            />
          </label>

          <label>
            Status
            <select
              value={form.status}
              onChange={(event) =>
                setForm({
                  ...form,
                  status: event.target.value as 'AVAILABLE' | 'BLOCKED',
                })
              }
            >
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="BLOCKED">BLOCKED</option>
            </select>
          </label>

          <label>
            Capacity
            <input
              required
              min="1"
              type="number"
              value={form.capacity}
              onChange={(event) =>
                setForm({ ...form, capacity: event.target.value })
              }
            />
          </label>

          <button className="button primary" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Create time slot'}
          </button>
        </form>
      </section>

      {isLoading ? <p className="state-message">Loading time slots...</p> : null}
      {!isLoading && timeSlots.length === 0 ? (
        <p className="state-message">No time slots match these filters.</p>
      ) : null}

      {!isLoading && timeSlots.length > 0 ? (
        <section className="admin-list" aria-label="Admin time slots">
          {timeSlots.map((slot) => (
            <AdminTimeSlotCard
              key={slot.id}
              slot={slot}
              isUpdating={updatingSlotId === slot.id}
              onBlock={() => void handleStatusUpdate(slot, 'BLOCKED')}
              onUnblock={() => void handleStatusUpdate(slot, 'AVAILABLE')}
              onCapacityChange={(capacity) =>
                void handleCapacityUpdate(slot, capacity)
              }
            />
          ))}
        </section>
      ) : null}
    </main>
  )
}

function AdminTimeSlotCard({
  slot,
  isUpdating,
  onBlock,
  onUnblock,
  onCapacityChange,
}: {
  slot: AdminTimeSlot
  isUpdating: boolean
  onBlock: () => void
  onUnblock: () => void
  onCapacityChange: (capacity: number) => void
}) {
  const startAt = new Date(slot.startAt)
  const endAt = new Date(slot.endAt)
  const [capacity, setCapacity] = useState(String(slot.capacity))

  function handleCapacitySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onCapacityChange(Number(capacity))
  }

  return (
    <article className="admin-card">
      <div className="booking-card-header">
        <div>
          <h2>{slot.service.name}</h2>
          <p className="card-description">{slot.service.durationMinutes} minutes</p>
        </div>
        <span className={`status-pill status-${slot.status.toLowerCase()}`}>
          {slot.status}
        </span>
      </div>

      <div className="booking-details-grid">
        <div>
          <dt>Date</dt>
          <dd>{formatDate(startAt)}</dd>
        </div>
        <div>
          <dt>Start</dt>
          <dd>{formatTime(startAt)}</dd>
        </div>
        <div>
          <dt>End</dt>
          <dd>{formatTime(endAt)}</dd>
        </div>
        <div>
          <dt>Capacity</dt>
          <dd>{slot.capacity}</dd>
        </div>
        <div>
          <dt>Booked places</dt>
          <dd>{slot.activeBookingCount}</dd>
        </div>
        <div>
          <dt>Remaining places</dt>
          <dd>{slot.remainingSpots}</dd>
        </div>
      </div>

      <form className="booking-actions" onSubmit={handleCapacitySubmit}>
        <label className="inline-field">
          Update capacity
          <input
            required
            min="1"
            type="number"
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
          />
        </label>
        <button className="button secondary" type="submit" disabled={isUpdating}>
          {isUpdating ? 'Updating...' : 'Save capacity'}
        </button>
      </form>

      <div className="booking-actions">
        {slot.status === 'AVAILABLE' ? (
          <button
            className="button secondary"
            type="button"
            onClick={onBlock}
            disabled={isUpdating}
          >
            {isUpdating ? 'Updating...' : 'Block'}
          </button>
        ) : null}

        {slot.status === 'BLOCKED' ? (
          <button
            className="button primary"
            type="button"
            onClick={onUnblock}
            disabled={isUpdating}
          >
            {isUpdating ? 'Updating...' : 'Unblock'}
          </button>
        ) : null}
      </div>
    </article>
  )
}

function getTimeSlotErrorMessage(error: unknown) {
  if (isAxiosError(error) && error.response?.status === 409) {
    return 'This time slot overlaps with an existing slot.'
  }

  return getErrorMessage(error, 'Could not create time slot')
}

function getErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message

    if (Array.isArray(message)) {
      return message.join(', ')
    }

    if (message) {
      return message
    }
  }

  return fallback
}
