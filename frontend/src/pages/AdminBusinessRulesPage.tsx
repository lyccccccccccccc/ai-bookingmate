import { isAxiosError } from 'axios'
import { motion, useReducedMotion } from 'framer-motion'
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
import {
  AdminEmptyState,
  AdminFeedback,
  AdminListSkeleton,
  AdminPageHeader,
} from '../components/admin/AdminWorkspace'
import '../admin-v2.css'

type RuleFormState = { title: string; category: string; content: string; isActive: boolean }
const emptyRuleForm: RuleFormState = { title: '', category: '', content: '', isActive: true }

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

  const categories = useMemo(() => Array.from(new Set(rules.map((rule) => rule.category))).sort(), [rules])
  const activeRuleCount = rules.filter((rule) => rule.isActive).length

  async function loadRules() {
    const data = await getBusinessRules({ category: categoryFilter || undefined })
    setRules(data)
  }

  useEffect(() => {
    let isMounted = true
    async function loadInitialRules() {
      setIsLoading(true); setMessage('')
      try {
        const data = await getBusinessRules({ category: categoryFilter || undefined })
        if (isMounted) { setRules(data); setError('') }
      } catch (caughtError) {
        if (isMounted) setError(getErrorMessage(caughtError, 'Could not load rules'))
      } finally { if (isMounted) setIsLoading(false) }
    }
    void loadInitialRules()
    return () => { isMounted = false }
  }, [categoryFilter])

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setIsSaving(true); setError(''); setMessage('')
    try {
      await createBusinessRule(toCreateRulePayload(form))
      await loadRules(); setForm(emptyRuleForm); setMessage('Business rule created successfully.')
    } catch (caughtError) { setError(getErrorMessage(caughtError, 'Could not create rule')) }
    finally { setIsSaving(false) }
  }

  function startEditing(rule: BusinessRule) {
    setEditingRule(rule)
    setEditForm({ title: rule.title, category: rule.category, content: rule.content, isActive: rule.isActive })
    setError(''); setMessage('')
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editingRule) return
    setIsSaving(true); setError(''); setMessage('')
    try {
      await updateBusinessRule(editingRule.id, toUpdateRulePayload(editForm))
      await loadRules(); setEditingRule(null); setEditForm(emptyRuleForm); setMessage('Business rule updated successfully.')
    } catch (caughtError) { setError(getErrorMessage(caughtError, 'Could not update rule')) }
    finally { setIsSaving(false) }
  }

  async function handleDeactivate(rule: BusinessRule) {
    const confirmed = window.confirm(`Deactivate "${rule.title}"? The assistant will stop using this rule.`)
    if (!confirmed) return
    setIsSaving(true); setError(''); setMessage('')
    try {
      await deactivateBusinessRule(rule.id)
      await loadRules(); setMessage('Business rule deactivated successfully.')
    } catch (caughtError) { setError(getErrorMessage(caughtError, 'Could not deactivate rule')) }
    finally { setIsSaving(false) }
  }

  return (
    <main className="page admin-page admin-v2-page">
      <AdminPageHeader
        title="Business rules"
        description="Manage the policies that provide context for customer assistant answers."
        action={!isLoading ? <span className="admin-count-badge">{activeRuleCount} active</span> : undefined}
      />
      <AdminFeedback message={message} error={error} />

      <section className="grounding-context-v2">
        <div className="grounding-mark" aria-hidden="true">AI</div>
        <div><p className="eyebrow">Grounding context</p><h2>Active rules influence supported assistant answers.</h2><p>The assistant retrieves these policies as business context. Keep each rule specific, current, and customer-friendly.</p></div>
        <dl><div><dt>Active rules shown</dt><dd>{activeRuleCount}</dd></div><div><dt>Behavior</dt><dd>Retrieval grounded</dd></div></dl>
      </section>

      <section className="admin-v2-form-card">
        <div className="admin-section-heading">
          <div><p className="eyebrow">Rule editor</p><h2>{editingRule ? 'Edit business rule' : 'Create business rule'}</h2><p>{editingRule ? `Updating ${editingRule.title}` : 'Add a policy for the assistant to retrieve when relevant.'}</p></div>
          {editingRule ? <button className="button secondary admin-compact-button" type="button" onClick={() => { setEditingRule(null); setEditForm(emptyRuleForm) }} disabled={isSaving}>Cancel edit</button> : null}
        </div>
        <RuleForm
          form={editingRule ? editForm : form}
          submitLabel={isSaving ? 'Saving...' : editingRule ? 'Save changes' : 'Create rule'}
          disabled={isSaving}
          onSubmit={editingRule ? handleUpdate : handleCreate}
          onChange={editingRule ? setEditForm : setForm}
          showActive={Boolean(editingRule)}
        />
      </section>

      <section className="admin-v2-list-toolbar">
        <div><p className="eyebrow">Rule library</p><h2>Existing rules</h2></div>
        <div className="admin-filter-group"><label>Category<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="">All categories</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label></div>
      </section>

      {isLoading ? <AdminListSkeleton /> : null}
      {!isLoading && !error && rules.length === 0 ? <AdminEmptyState title="No business rules match this filter" description="Choose another category or create a new rule above." /> : null}
      {!isLoading && rules.length > 0 ? (
        <section className="admin-v2-list admin-rules-list" aria-label="Business rules">
          {rules.map((rule, index) => <RuleRow key={rule.id} rule={rule} index={index} disabled={isSaving} onEdit={() => startEditing(rule)} onDeactivate={() => void handleDeactivate(rule)} />)}
        </section>
      ) : null}
    </main>
  )
}

function RuleRow({ rule, index, disabled, onEdit, onDeactivate }: { rule: BusinessRule; index: number; disabled: boolean; onEdit: () => void; onDeactivate: () => void }) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.article className={`admin-rule-row${rule.isActive ? '' : ' admin-rule-inactive'}`} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, delay: reduceMotion ? 0 : Math.min(index * 0.04, 0.22) }}>
      <header><div><span>{rule.category}</span><h3>{rule.title}</h3></div><span className={`admin-state-pill ${rule.isActive ? 'state-active' : 'state-inactive'}`}>{rule.isActive ? 'Active' : 'Inactive'}</span></header>
      <p>{rule.content}</p>
      <footer><span>Updated {new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(rule.updatedAt))}</span><div className="admin-row-actions"><button className="button secondary admin-compact-button" type="button" onClick={onEdit} disabled={disabled}>Edit</button>{rule.isActive ? <button className="button admin-danger-outline admin-compact-button" type="button" onClick={onDeactivate} disabled={disabled}>Deactivate</button> : null}</div></footer>
    </motion.article>
  )
}

function RuleForm({ form, submitLabel, disabled, showActive, onSubmit, onChange }: { form: RuleFormState; submitLabel: string; disabled: boolean; showActive: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onChange: (form: RuleFormState) => void }) {
  return (
    <form className="admin-v2-form rule-form-v2" onSubmit={onSubmit}>
      <label>Title<input required value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} /></label>
      <label>Category<input required placeholder="cancellation" value={form.category} onChange={(event) => onChange({ ...form, category: event.target.value })} /></label>
      <label className="admin-wide-field">Rule content<textarea required rows={5} value={form.content} onChange={(event) => onChange({ ...form, content: event.target.value })} /></label>
      {showActive ? <label className="admin-checkbox-field"><input checked={form.isActive} type="checkbox" onChange={(event) => onChange({ ...form, isActive: event.target.checked })} /><span>Active rule</span></label> : <span />}
      <div className="admin-form-submit"><button className="button primary" type="submit" disabled={disabled}>{submitLabel}</button></div>
    </form>
  )
}

function toCreateRulePayload(form: RuleFormState): BusinessRuleFormData { return { title: form.title.trim(), category: form.category.trim(), content: form.content.trim() } }
function toUpdateRulePayload(form: RuleFormState): BusinessRuleUpdateData { return { ...toCreateRulePayload(form), isActive: form.isActive } }
function getErrorMessage(error: unknown, fallback: string) { if (isAxiosError<{ message?: string | string[] }>(error)) { const message = error.response?.data?.message; if (Array.isArray(message)) return message.join(', '); if (message) return message } return fallback }
