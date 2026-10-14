import { useState, type FormEvent } from 'react'
import { API_BASE } from '../api/client'

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
    <form onSubmit={handleSubmit}>
      <h3 style={{ margin: '0 0 8px', fontSize: '0.95rem' }}>Create account</h3>

      <div>
        <label htmlFor="register-email">Email</label>
        <input
          id="register-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box' }}
          required
        />
      </div>

      <div>
        <label htmlFor="register-password">Password</label>
        <input
          id="register-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          maxLength={72}
          style={{ width: '100%', boxSizing: 'border-box' }}
          required
        />
      </div>

      {error && <p role="alert">{error}</p>}
      {success && <p>Account created! Going to sign in...</p>}

      <button type="submit" style={{ width: '100%', marginTop: 8 }}>
        Create account
      </button>

      <p style={{ marginTop: 8, fontSize: '0.85rem' }}>
        Already have an account?{' '}
        <button type="button" onClick={onSwitchToLogin}>
          Sign in
        </button>
      </p>
    </form>
  )
}