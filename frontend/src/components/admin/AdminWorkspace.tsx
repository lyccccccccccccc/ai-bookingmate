import type { ReactNode } from 'react'
import { Reveal } from '../Reveal'

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <Reveal>
      <header className="admin-v2-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {action ? <div className="admin-v2-header-action">{action}</div> : null}
      </header>
    </Reveal>
  )
}

export function AdminFeedback({
  message,
  error,
}: {
  message: string
  error: string
}) {
  if (!message && !error) {
    return null
  }

  return (
    <div
      className={`admin-v2-feedback ${error ? 'admin-v2-feedback-error' : 'admin-v2-feedback-success'}`}
      role={error ? 'alert' : 'status'}
    >
      <span aria-hidden="true">{error ? '!' : ''}</span>
      <p>{error || message}</p>
    </div>
  )
}

export function AdminEmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="admin-v2-empty">
      <span aria-hidden="true">0</span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  )
}

export function AdminListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="admin-v2-skeleton" aria-label="Loading admin data" aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index}>
          <span className="skeleton admin-skeleton-title" />
          <span className="skeleton admin-skeleton-line" />
          <span className="skeleton admin-skeleton-short" />
        </div>
      ))}
      <span className="sr-only">Loading admin data</span>
    </div>
  )
}
