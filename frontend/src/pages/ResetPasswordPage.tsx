import { isAxiosError } from 'axios'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../api/authApi'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!token) {
      setError('This password reset link is invalid or incomplete.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await resetPassword(token, newPassword)
      setMessage(response.message)
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Unable to reset password.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="page form-page">
      <form className="form-card" onSubmit={handleSubmit}>
        <div>
          <p className="eyebrow">Account recovery</p>
          <h1>Choose a new password</h1>
          <p className="card-description">Use at least eight characters for your new password.</p>
        </div>

        {error ? <p className="error-message">{error}</p> : null}
        {message ? (
          <p className="success-message">
            {message} <Link to="/login">Go to login</Link>
          </p>
        ) : null}

        <label>
          New password
          <input type="password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
        </label>

        <label>
          Confirm new password
          <input type="password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
        </label>

        <button className="button primary full-width" type="submit" disabled={isSubmitting || Boolean(message)}>
          {isSubmitting ? 'Resetting password...' : 'Reset password'}
        </button>
      </form>
    </main>
  )
}

function getErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message
    return Array.isArray(message) ? message.join(', ') : message ?? fallback
  }

  return fallback
}
