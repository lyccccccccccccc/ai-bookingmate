import { isAxiosError } from 'axios'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  createBusinessRule,
  deactivateBusinessRule,
  getBusinessRules,
  updateBusinessRule,
  type BusinessRule,
  type BusinessRuleFormData,
  type BusinessRuleUpdateData,
} from '../api/adminBusinessRulesApi'

type RuleFormState = {
  title: string
  category: string
  content: string
  isActive: boolean
}

const emptyRuleForm: RuleFormState = {
  title: '',
  category: '',
  content: '',
  isActive: true,
}

export function AdminBusinessRulesPage() {
  const [rules, setRules] = useState<BusinessRule[]>([])
  const [form, setForm] = useState<RuleFormState>(emptyRuleForm)
  const [editForm, setEditForm] = useState<RuleFormState>(emptyRuleForm)
  const [editingRule, setEditingRule] = useState<BusinessRule | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const categories = useMemo(
    () => Array.from(new Set(rules.map((rule) => rule.category))).sort(),
    [rules],
  )

  async function loadRules() {
    const data = await getBusinessRules({
      category: categoryFilter || undefined,
    })
    setRules(data)
  }

  useEffect(() => {
    let isMounted = true

    async function loadInitialRules() {
      setIsLoading(true)
      setMessage('')

      try {
        const data = await getBusinessRules({
          category: categoryFilter || undefined,
        })

        if (isMounted) {
          setRules(data)
          setError('')
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(getErrorMessage(caughtError, 'Could not load rules'))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadInitialRules()

    return () => {
      isMounted = false
    }
  }, [categoryFilter])

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    setMessage('')

    try {
      await createBusinessRule(toCreateRulePayload(form))
      await loadRules()
      setForm(emptyRuleForm)
      setMessage('Business rule created successfully.')
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Could not create rule'))
    } finally {
      setIsSaving(false)
    }
  }

  function startEditing(rule: BusinessRule) {
    setEditingRule(rule)
    setEditForm({
      title: rule.title,
      category: rule.category,
      content: rule.content,
      isActive: rule.isActive,
    })
    setError('')
    setMessage('')
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!editingRule) {
      return
    }

    setIsSaving(true)
    setError('')
    setMessage('')

    try {
      await updateBusinessRule(editingRule.id, toUpdateRulePayload(editForm))
      await loadRules()
      setEditingRule(null)
      setEditForm(emptyRuleForm)
      setMessage('Business rule updated successfully.')
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Could not update rule'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeactivate(rule: BusinessRule) {
    const confirmed = window.confirm(
      `Deactivate "${rule.title}"? The assistant will stop using this rule.`,
    )

    if (!confirmed) {
      return
    }

    setIsSaving(true)
    setError('')
    setMessage('')

    try {
      await deactivateBusinessRule(rule.id)
      await loadRules()
      setMessage('Business rule deactivated successfully.')
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Could not deactivate rule'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="page admin-page">
      <section className="page-header">
        <p className="eyebrow">Admin</p>
        <h1>Admin Business Rules</h1>
        <p className="lede">
          Manage the business policies that ground the customer assistant.
        </p>
      </section>

      {message ? <p className="success-message">{message}</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      <section className="admin-toolbar" aria-label="Business rule filters">
        <label className="filter-label">
          Category
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="admin-form-section">
        <h2>Create Business Rule</h2>
        <RuleForm
          form={form}
          submitLabel={isSaving ? 'Saving...' : 'Create rule'}
          onSubmit={handleCreate}
          onChange={setForm}
          disabled={isSaving}
        />
      </section>

      {editingRule ? (
        <section className="admin-form-section">
          <div className="section-heading-row">
            <h2>Edit Business Rule</h2>
            <button
              className="button secondary"
              type="button"
              onClick={() => setEditingRule(null)}
            >
              Cancel edit
            </button>
          </div>
          <RuleForm
            form={editForm}
            submitLabel={isSaving ? 'Saving...' : 'Save changes'}
            onSubmit={handleUpdate}
            onChange={setEditForm}
            disabled={isSaving}
            showActive
          />
        </section>
      ) : null}

      {isLoading ? <p className="state-message">Loading rules...</p> : null}
      {!isLoading && rules.length === 0 ? (
        <p className="state-message">No business rules match this filter.</p>
      ) : null}

      {!isLoading && rules.length > 0 ? (
        <section className="admin-list" aria-label="Business rules">
          {rules.map((rule) => (
            <article className="admin-card" key={rule.id}>
              <div className="booking-card-header">
                <div>
                  <h2>{rule.title}</h2>
                  <p className="card-description">{rule.category}</p>
                </div>
                <span
                  className={`status-pill ${
                    rule.isActive ? 'status-available' : 'status-cancelled'
                  }`}
                >
                  {rule.isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>

              <p className="business-rule-content">{rule.content}</p>

              <div className="booking-actions">
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => startEditing(rule)}
                  disabled={isSaving}
                >
                  Edit
                </button>
                {rule.isActive ? (
                  <button
                    className="button danger"
                    type="button"
                    onClick={() => void handleDeactivate(rule)}
                    disabled={isSaving}
                  >
                    Deactivate
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  )
}

function RuleForm({
  form,
  submitLabel,
  disabled,
  showActive = false,
  onSubmit,
  onChange,
}: {
  form: RuleFormState
  submitLabel: string
  disabled: boolean
  showActive?: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onChange: (form: RuleFormState) => void
}) {
  return (
    <form className="admin-form rule-form" onSubmit={onSubmit}>
      <label>
        Title
        <input
          required
          value={form.title}
          onChange={(event) => onChange({ ...form, title: event.target.value })}
        />
      </label>

      <label>
        Category
        <input
          required
          placeholder="cancellation"
          value={form.category}
          onChange={(event) =>
            onChange({ ...form, category: event.target.value })
          }
        />
      </label>

      <label className="wide-field">
        Rule content
        <textarea
          required
          rows={5}
          value={form.content}
          onChange={(event) =>
            onChange({ ...form, content: event.target.value })
          }
        />
      </label>

      {showActive ? (
        <label className="checkbox-label">
          <input
            checked={form.isActive}
            type="checkbox"
            onChange={(event) =>
              onChange({ ...form, isActive: event.target.checked })
            }
          />
          Active
        </label>
      ) : null}

      <button className="button primary" type="submit" disabled={disabled}>
        {submitLabel}
      </button>
    </form>
  )
}

function toCreateRulePayload(form: RuleFormState): BusinessRuleFormData {
  return {
    title: form.title.trim(),
    category: form.category.trim(),
    content: form.content.trim(),
  }
}

function toUpdateRulePayload(form: RuleFormState): BusinessRuleUpdateData {
  return {
    ...toCreateRulePayload(form),
    isActive: form.isActive,
  }
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
