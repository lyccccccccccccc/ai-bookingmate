import { isAxiosError } from 'axios'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../api/authApi'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [devResetUrl, setDevResetUrl] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    setDevResetUrl('')
    setIsSubmitting(true)

    try {
      const response = await forgotPassword(email)
      setMessage(response.message)
      setDevResetUrl(response.devResetUrl ?? '')
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Unable to request a password reset.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="page form-page">
      <form className="form-card" onSubmit={handleSubmit}>
        <div>
          <p className="eyebrow">Account recovery</p>
          <h1>Forgot password?</h1>
          <p className="card-description">
            Enter your email and we will prepare a password reset link if an account exists.
          </p>
        </div>

        {error ? <p className="error-message">{error}</p> : null}
        {message ? <p className="success-message">{message}</p> : null}
        {devResetUrl ? (
          <p className="dev-reset-link">
            Development reset link: <a href={devResetUrl}>Reset your password</a>
          </p>
        ) : null}

        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>

        <button className="button primary full-width" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Preparing link...' : 'Request reset link'}
        </button>

        <p className="helper-text">
          Remembered your password? <Link to="/login">Back to login</Link>
        </p>
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
