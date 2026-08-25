import { isAxiosError } from 'axios'
import { motion, useReducedMotion } from 'framer-motion'
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
import {
  AdminEmptyState,
  AdminFeedback,
  AdminListSkeleton,
  AdminPageHeader,
} from '../components/admin/AdminWorkspace'
import { formatDate, formatTime } from '../components/TimeSlotCard'
import '../admin-v2.css'

type StatusFilter = 'ALL' | TimeSlotStatus
type TimeSlotFormState = {
  serviceId: string
  startAt: string
  endAt: string
  status: 'AVAILABLE' | 'BLOCKED'
  capacity: string
}

const emptyTimeSlotForm: TimeSlotFormState = {
  serviceId: '', startAt: '', endAt: '', status: 'AVAILABLE', capacity: '1',
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
          setForm((current) => ({ ...current, serviceId: current.serviceId || data[0]?.id || '' }))
        }
      } catch (caughtError) {
        if (isMounted) setError(getErrorMessage(caughtError, 'Could not load services'))
      }
    }
    void loadServices()
    return () => { isMounted = false }
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
        if (isMounted) { setTimeSlots(data); setError('') }
      } catch (caughtError) {
        if (isMounted) setError(getErrorMessage(caughtError, 'Could not load time slots'))
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    void loadFilteredSlots()
    return () => { isMounted = false }
  }, [serviceFilter, statusFilter])

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true); setError(''); setMessage('')
    try {
      await createTimeSlot({
        serviceId: form.serviceId,
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        status: form.status,
        capacity: Number(form.capacity),
      })
      await loadTimeSlots()
      setForm({ ...emptyTimeSlotForm, serviceId: form.serviceId || services[0]?.id || '' })
      setMessage('Time slot created successfully.')
    } catch (caughtError) {
      setError(getTimeSlotErrorMessage(caughtError))
    } finally { setIsSaving(false) }
  }

  async function handleStatusUpdate(slot: AdminTimeSlot, status: 'AVAILABLE' | 'BLOCKED') {
    setUpdatingSlotId(slot.id); setError(''); setMessage('')
    try {
      await updateTimeSlotStatus(slot.id, status)
      await loadTimeSlots()
      setMessage(`Time slot ${status === 'BLOCKED' ? 'blocked' : 'unblocked'}.`)
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Could not update time slot'))
    } finally { setUpdatingSlotId(null) }
  }

  async function handleCapacityUpdate(slot: AdminTimeSlot, capacity: number) {
    setUpdatingSlotId(slot.id); setError(''); setMessage('')
    try {
      await updateTimeSlotCapacity(slot.id, capacity)
      await loadTimeSlots()
      setMessage('Time slot capacity updated.')
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Could not update time slot capacity'))
    } finally { setUpdatingSlotId(null) }
  }

  return (
    <main className="page admin-page admin-v2-page">
      <AdminPageHeader
        title="Time slots"
        description="Create availability, manage capacity, and block times when needed."
        action={!isLoading ? <span className="admin-count-badge">{timeSlots.length} shown</span> : undefined}
      />
      <AdminFeedback message={message} error={error} />

      <section className="admin-v2-form-card">
        <div className="admin-section-heading">
          <div><p className="eyebrow">Schedule control</p><h2>Create time slot</h2><p>Add a bookable or blocked period for an active service.</p></div>
        </div>
        <form className="admin-v2-form time-slot-form-v2" onSubmit={handleCreate}>
          <label>Service<select required value={form.serviceId} onChange={(event) => setForm({ ...form, serviceId: event.target.value })}><option value="">Choose a service</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
          <label>Start time<input required type="datetime-local" value={form.startAt} onChange={(event) => setForm({ ...form, startAt: event.target.value })} /></label>
          <label>End time<input required type="datetime-local" value={form.endAt} onChange={(event) => setForm({ ...form, endAt: event.target.value })} /></label>
          <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as 'AVAILABLE' | 'BLOCKED' })}><option value="AVAILABLE">Available</option><option value="BLOCKED">Blocked</option></select></label>
          <label>Capacity<input required min="1" type="number" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} /></label>
          <div className="admin-form-submit"><button className="button primary" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Create time slot'}</button></div>
        </form>
      </section>

      <section className="admin-v2-list-toolbar">
        <div><p className="eyebrow">Schedule</p><h2>Existing time slots</h2></div>
        <div className="admin-filter-group" aria-label="Time slot filters">
          <label>Service<select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)}><option value="">All services</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
          <label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>{statusFilters.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}</select></label>
        </div>
      </section>

      {isLoading ? <AdminListSkeleton rows={4} /> : null}
      {!isLoading && !error && timeSlots.length === 0 ? <AdminEmptyState title="No time slots match these filters" description="Adjust the service or status filters, or create a new slot above." /> : null}
      {!isLoading && timeSlots.length > 0 ? (
        <section className="admin-v2-list admin-slots-list" aria-label="Admin time slots">
          {timeSlots.map((slot, index) => (
            <AdminTimeSlotRow
              key={slot.id}
              slot={slot}
              index={index}
              isUpdating={updatingSlotId === slot.id}
              isAnyUpdating={updatingSlotId !== null}
              onBlock={() => void handleStatusUpdate(slot, 'BLOCKED')}
              onUnblock={() => void handleStatusUpdate(slot, 'AVAILABLE')}
              onCapacityChange={(capacity) => void handleCapacityUpdate(slot, capacity)}
            />
          ))}
        </section>
      ) : null}
    </main>
  )
}

function AdminTimeSlotRow({ slot, index, isUpdating, isAnyUpdating, onBlock, onUnblock, onCapacityChange }: {
  slot: AdminTimeSlot; index: number; isUpdating: boolean; isAnyUpdating: boolean
  onBlock: () => void; onUnblock: () => void; onCapacityChange: (capacity: number) => void
}) {
  const reduceMotion = useReducedMotion()
  const startAt = new Date(slot.startAt)
  const endAt = new Date(slot.endAt)
  const [capacity, setCapacity] = useState(String(slot.capacity))
  useEffect(() => { setCapacity(String(slot.capacity)) }, [slot.capacity])
  const occupiedPercentage = Math.min(100, Math.max(0, (slot.activeBookingCount / slot.capacity) * 100))
  function handleCapacitySubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); onCapacityChange(Number(capacity)) }

  return (
    <motion.article className="admin-slot-row" initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, delay: reduceMotion ? 0 : Math.min(index * 0.035, 0.2) }}>
      <div className="admin-slot-heading"><div><span>{formatDate(startAt)}</span><h3>{slot.service.name}</h3><small>{formatTime(startAt)} - {formatTime(endAt)} | {slot.service.durationMinutes} min</small></div><span className={`status-pill status-${slot.status.toLowerCase()}`}>{formatStatus(slot.status)}</span></div>
      <div className="admin-utilization">
        <div><span>Utilization</span><strong>{slot.activeBookingCount} / {slot.capacity} booked</strong><small>{slot.remainingSpots} remaining</small></div>
        <span className="admin-progress-track" aria-label={`${slot.activeBookingCount} of ${slot.capacity} places booked`}><span style={{ width: `${occupiedPercentage}%` }} /></span>
      </div>
      <div className="admin-slot-controls">
        <form className="admin-capacity-form" onSubmit={handleCapacitySubmit}><label>Capacity<input required min={Math.max(1, slot.activeBookingCount)} type="number" value={capacity} onChange={(event) => setCapacity(event.target.value)} /></label><button className="button secondary admin-compact-button" type="submit" disabled={isAnyUpdating}>{isUpdating ? 'Updating...' : 'Save'}</button></form>
        <div className="admin-row-actions">
          {slot.status === 'AVAILABLE' ? <button className="button secondary admin-compact-button" type="button" onClick={onBlock} disabled={isAnyUpdating}>{isUpdating ? 'Updating...' : 'Block'}</button> : null}
          {slot.status === 'BLOCKED' ? <button className="button primary admin-compact-button" type="button" onClick={onUnblock} disabled={isAnyUpdating}>{isUpdating ? 'Updating...' : 'Unblock'}</button> : null}
        </div>
      </div>
    </motion.article>
  )
}

function formatStatus(status: StatusFilter) { return status.charAt(0) + status.slice(1).toLowerCase() }
function getTimeSlotErrorMessage(error: unknown) { if (isAxiosError(error) && error.response?.status === 409) return 'This time slot overlaps with an existing slot.'; return getErrorMessage(error, 'Could not create time slot') }
function getErrorMessage(error: unknown, fallback: string) { if (isAxiosError<{ message?: string | string[] }>(error)) { const message = error.response?.data?.message; if (Array.isArray(message)) return message.join(', '); if (message) return message } return fallback }
