import { useState, type FormEvent } from 'react'
import { API_BASE, setToken } from '../api/client'

interface LoginFormProps {
  onLoggedIn: () => void
  onSwitchToRegister: () => void
}

export function LoginForm({ onLoggedIn, onSwitchToRegister }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // Login is a public endpoint, so plain fetch (no token to attach yet)
  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        // Too many attempts (rate limit): the API sends a message for it
        if (response.status === 429) {
          const data = await response.json().catch(() => null)
          throw new Error(data?.message ?? 'Too many attempts. Try again in a minute.')
        }
        throw new Error('Invalid email or password')
      }

      const data = await response.json()
      setToken(data.token)
      onLoggedIn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3 style={{ margin: '0 0 8px', fontSize: '0.95rem' }}>Sign in</h3>

      <div>
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box' }}
          required
        />
      </div>

      <div>
        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box' }}
          required
        />
      </div>

      {error && <p role="alert">{error}</p>}

      <button type="submit" style={{ width: '100%', marginTop: 8 }}>
        Sign in
      </button>

      <p style={{ marginTop: 8, fontSize: '0.85rem' }}>
        Don't have an account?{' '}
        <button type="button" onClick={onSwitchToRegister}>
          Sign up
        </button>
      </p>
    </form>
  )
}