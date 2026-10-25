import { useState, type FormEvent } from 'react'
import { API_BASE } from '../../api/client'
import './AuthForm.css'

interface RegisterFormProps {
  onRegistered: () => void
  onSwitchToLogin: () => void
}

export function RegisterForm({ onRegistered, onSwitchToLogin }: RegisterFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        // The API answers { message } for known errors (e.g. 409 when the
        // email already exists), so show that instead of a generic text.
        const data = await response.json().catch(() => null)
        throw new Error(data?.message ?? 'Failed to create account')
      }

      setSuccess(true)
      setTimeout(onRegistered, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    }
  }

    return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h3 className="auth-title">Create account</h3>

      <div className="auth-field">
        <label htmlFor="register-email">Email</label>
        <input
          id="register-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="auth-field">
        <label htmlFor="register-password">Password</label>
        <input
          id="register-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          maxLength={72}
          required
        />
      </div>

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
      {success && <p className="auth-success">Account created! Going to sign in...</p>}

      <button type="submit" className="auth-submit">
        Create account
      </button>

      <p className="auth-switch">
        Already have an account?{' '}
        <button type="button" className="auth-link" onClick={onSwitchToLogin}>
          Sign in
        </button>
      </p>
    </form>
  )
}