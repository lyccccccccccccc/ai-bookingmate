import { isAxiosError } from 'axios'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState, type FormEvent } from 'react'
import {
  createService,
  deactivateService,
  updateService,
  type ServiceFormData,
} from '../api/adminServicesApi'
import { getServices, type Service } from '../api/servicesApi'
import {
  AdminEmptyState,
  AdminFeedback,
  AdminListSkeleton,
  AdminPageHeader,
} from '../components/admin/AdminWorkspace'
import { formatPrice } from '../components/ServiceCard'
import { formatDate } from '../components/TimeSlotCard'
import '../admin-v2.css'

type ServiceFormState = {
  name: string
  description: string
  durationMinutes: string
  priceDollars: string
}

const emptyServiceForm: ServiceFormState = {
  name: '',
  description: '',
  durationMinutes: '',
  priceDollars: '',
}

export function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [form, setForm] = useState<ServiceFormState>(emptyServiceForm)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [editForm, setEditForm] = useState<ServiceFormState>(emptyServiceForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function loadServices() {
    const data = await getServices()
    setServices(data)
  }

  useEffect(() => {
    let isMounted = true

    async function loadInitialServices() {
      setIsLoading(true)
      try {
        const data = await getServices()
        if (isMounted) {
          setServices(data)
          setError('')
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(getErrorMessage(caughtError, 'Could not load services'))
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void loadInitialServices()
    return () => { isMounted = false }
  }, [])

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    setMessage('')
    try {
      await createService(toServicePayload(form))
      await loadServices()
      setForm(emptyServiceForm)
      setMessage('Service created successfully.')
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Could not create service'))
    } finally {
      setIsSaving(false)
    }
  }

  function startEditing(service: Service) {
    setEditingService(service)
    setEditForm({
      name: service.name,
      description: service.description ?? '',
      durationMinutes: String(service.durationMinutes),
      priceDollars: service.priceCents === null ? '' : (service.priceCents / 100).toFixed(2),
    })
    setError('')
    setMessage('')
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingService) return
    setIsSaving(true)
    setError('')
    setMessage('')
    try {
      await updateService(editingService.id, toServicePayload(editForm))
      await loadServices()
      setEditingService(null)
      setEditForm(emptyServiceForm)
      setMessage('Service updated successfully.')
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Could not update service'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeactivate(service: Service) {
    const confirmed = window.confirm(
      `Deactivate "${service.name}"? It will no longer appear to customers.`,
    )
    if (!confirmed) return
    setIsSaving(true)
    setError('')
    setMessage('')
    try {
      await deactivateService(service.id)
      await loadServices()
      setMessage('Service deactivated successfully.')
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Could not deactivate service'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="page admin-page admin-v2-page">
      <AdminPageHeader
        title="Services"
        description="Create and maintain the services customers can book."
        action={!isLoading ? <span className="admin-count-badge">{services.length} active</span> : undefined}
      />

      <AdminFeedback message={message} error={error} />

      <section className="admin-v2-form-card">
        <div className="admin-section-heading">
          <div>
            <p className="eyebrow">Service editor</p>
            <h2>{editingService ? 'Edit service' : 'Create service'}</h2>
            <p>{editingService ? `Updating ${editingService.name}` : 'Add a customer-facing service to the active catalog.'}</p>
          </div>
          {editingService ? (
            <button
              className="button secondary admin-compact-button"
              type="button"
              onClick={() => { setEditingService(null); setEditForm(emptyServiceForm) }}
              disabled={isSaving}
            >
              Cancel edit
            </button>
          ) : null}
        </div>

        <ServiceForm
          form={editingService ? editForm : form}
          submitLabel={isSaving ? 'Saving...' : editingService ? 'Save changes' : 'Create service'}
          onSubmit={editingService ? handleUpdate : handleCreate}
          onChange={editingService ? setEditForm : setForm}
          disabled={isSaving}
        />
      </section>

      <section className="admin-v2-section-heading">
        <div><p className="eyebrow">Service catalog</p><h2>Active services</h2></div>
        <p>Deactivation preserves booking history while removing a service from public browsing.</p>
      </section>

      {isLoading ? <AdminListSkeleton /> : null}
      {!isLoading && !error && services.length === 0 ? (
        <AdminEmptyState title="No services found" description="Create a service above to make it available for scheduling." />
      ) : null}

      {!isLoading && services.length > 0 ? (
        <section className="admin-v2-list admin-services-list" aria-label="Active services">
          {services.map((service, index) => (
            <ServiceRow
              key={service.id}
              service={service}
              index={index}
              disabled={isSaving}
              onEdit={() => startEditing(service)}
              onDeactivate={() => void handleDeactivate(service)}
            />
          ))}
        </section>
      ) : null}
    </main>
  )
}

function ServiceRow({
  service,
  index,
  disabled,
  onEdit,
  onDeactivate,
}: {
  service: Service
  index: number
  disabled: boolean
  onEdit: () => void
  onDeactivate: () => void
}) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.article
      className="admin-service-row"
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: reduceMotion ? 0 : Math.min(index * 0.04, 0.22) }}
    >
      <div className="admin-service-copy">
        <div>
          <h3>{service.name}</h3>
          <span className="admin-state-pill state-active">Active</span>
        </div>
        <p>{service.description || 'No description provided.'}</p>
      </div>
      <dl className="admin-service-facts">
        <div><dt>Duration</dt><dd>{service.durationMinutes} min</dd></div>
        <div><dt>Price</dt><dd>{formatPrice(service.priceCents)}</dd></div>
        <div><dt>Created</dt><dd>{formatDate(new Date(service.createdAt))}</dd></div>
      </dl>
      <div className="admin-row-actions">
        <button className="button secondary admin-compact-button" type="button" onClick={onEdit} disabled={disabled}>Edit</button>
        <button className="button admin-danger-outline admin-compact-button" type="button" onClick={onDeactivate} disabled={disabled}>Deactivate</button>
      </div>
    </motion.article>
  )
}

function ServiceForm({
  form,
  submitLabel,
  disabled,
  onSubmit,
  onChange,
}: {
  form: ServiceFormState
  submitLabel: string
  disabled: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onChange: (form: ServiceFormState) => void
}) {
  return (
    <form className="admin-v2-form service-form-v2" onSubmit={onSubmit}>
      <label>Name<input required value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} /></label>
      <label>Duration in minutes<input min="1" required type="number" value={form.durationMinutes} onChange={(event) => onChange({ ...form, durationMinutes: event.target.value })} /></label>
      <label className="admin-wide-field">Description<textarea rows={3} value={form.description} onChange={(event) => onChange({ ...form, description: event.target.value })} /></label>
      <label>Price in dollars<input min="0" step="0.01" type="number" value={form.priceDollars} onChange={(event) => onChange({ ...form, priceDollars: event.target.value })} /></label>
      <div className="admin-form-submit"><button className="button primary" type="submit" disabled={disabled}>{submitLabel}</button></div>
    </form>
  )
}

function toServicePayload(form: ServiceFormState): ServiceFormData {
  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    durationMinutes: Number(form.durationMinutes),
    priceCents: form.priceDollars === '' ? undefined : Math.round(Number(form.priceDollars) * 100),
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message
    if (Array.isArray(message)) return message.join(', ')
    if (message) return message
  }
  return fallback
}
