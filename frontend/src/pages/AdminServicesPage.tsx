import { isAxiosError } from 'axios'
import { useEffect, useState, type FormEvent } from 'react'
import {
  createService,
  deactivateService,
  updateService,
  type ServiceFormData,
} from '../api/adminServicesApi'
import { getServices, type Service } from '../api/servicesApi'

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
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadInitialServices()

    return () => {
      isMounted = false
    }
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
      priceDollars:
        service.priceCents === null ? '' : (service.priceCents / 100).toFixed(2),
    })
    setError('')
    setMessage('')
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!editingService) {
      return
    }

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

    if (!confirmed) {
      return
    }

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
    <main className="page admin-page">
      <section className="page-header">
        <p className="eyebrow">Admin</p>
        <h1>Admin Services</h1>
        <p className="lede">
          Create, edit, and deactivate the services customers can book.
        </p>
      </section>

      {message ? <p className="success-message">{message}</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      <section className="admin-form-section">
        <h2>Create Service</h2>
        <ServiceForm
          form={form}
          submitLabel={isSaving ? 'Saving...' : 'Create service'}
          onSubmit={handleCreate}
          onChange={setForm}
          disabled={isSaving}
        />
      </section>

      {editingService ? (
        <section className="admin-form-section">
          <div className="section-heading-row">
            <h2>Edit Service</h2>
            <button
              className="button secondary"
              type="button"
              onClick={() => setEditingService(null)}
            >
              Cancel edit
            </button>
          </div>
          <ServiceForm
            form={editForm}
            submitLabel={isSaving ? 'Saving...' : 'Save changes'}
            onSubmit={handleUpdate}
            onChange={setEditForm}
            disabled={isSaving}
          />
        </section>
      ) : null}

      {isLoading ? <p className="state-message">Loading services...</p> : null}
      {!isLoading && services.length === 0 ? (
        <p className="state-message">No active services yet.</p>
      ) : null}

      {!isLoading && services.length > 0 ? (
        <section className="admin-list" aria-label="Active services">
          {services.map((service) => (
            <article className="admin-card" key={service.id}>
              <div className="booking-card-header">
                <div>
                  <h2>{service.name}</h2>
                  <p className="card-description">
                    {service.description || 'No description provided.'}
                  </p>
                </div>
                <span className="status-pill status-available">
                  {service.isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>

              <div className="booking-details-grid">
                <div>
                  <dt>Duration</dt>
                  <dd>{service.durationMinutes} minutes</dd>
                </div>
                <div>
                  <dt>Price</dt>
                  <dd>{formatPrice(service.priceCents)}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{new Date(service.createdAt).toLocaleDateString()}</dd>
                </div>
              </div>

              <div className="booking-actions">
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => startEditing(service)}
                  disabled={isSaving}
                >
                  Edit
                </button>
                <button
                  className="button danger"
                  type="button"
                  onClick={() => void handleDeactivate(service)}
                  disabled={isSaving}
                >
                  Deactivate
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </main>
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
    <form className="admin-form" onSubmit={onSubmit}>
      <label>
        Name
        <input
          required
          value={form.name}
          onChange={(event) => onChange({ ...form, name: event.target.value })}
        />
      </label>

      <label>
        Description
        <input
          value={form.description}
          onChange={(event) =>
            onChange({ ...form, description: event.target.value })
          }
        />
      </label>

      <label>
        Duration in minutes
        <input
          min="1"
          required
          type="number"
          value={form.durationMinutes}
          onChange={(event) =>
            onChange({ ...form, durationMinutes: event.target.value })
          }
        />
      </label>

      <label>
        Price in dollars
        <input
          min="0"
          step="0.01"
          type="number"
          value={form.priceDollars}
          onChange={(event) =>
            onChange({ ...form, priceDollars: event.target.value })
          }
        />
      </label>

      <button className="button primary" type="submit" disabled={disabled}>
        {submitLabel}
      </button>
    </form>
  )
}

function toServicePayload(form: ServiceFormState): ServiceFormData {
  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    durationMinutes: Number(form.durationMinutes),
    priceCents:
      form.priceDollars === ''
        ? undefined
        : Math.round(Number(form.priceDollars) * 100),
  }
}

function formatPrice(priceCents: number | null) {
  if (priceCents === null) {
    return 'No price set'
  }

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  }).format(priceCents / 100)
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
