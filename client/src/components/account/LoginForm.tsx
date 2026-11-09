import { useState, type FormEvent } from 'react'
import { API_BASE, setToken } from '../../api/client'
import './AuthForm.css'

interface LoginFormProps {
  onLoggedIn: () => void
  onSwitchToRegister: () => void
}

export function LoginForm({ onLoggedIn, onSwitchToRegister }: LoginFormProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // Login is a public endpoint, so plain fetch (no token to attach yet)
  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password) {
      setError('Enter your username and password.')
      return
    }

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        // Too many attempts (rate limit): the API sends a message for it
        if (response.status === 429) {
          const data = await response.json().catch(() => null)
          throw new Error(data?.message ?? 'Too many attempts. Try again in a minute.')
        }
        throw new Error('Invalid username or password')
      }

      const data = await response.json()
      setToken(data.token)
      onLoggedIn()
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Can't reach the server. Try again in a moment."
          : err instanceof Error
            ? err.message
            : 'Login failed',
      )
    }
  }

    return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <h3 className="auth-title">Sign in</h3>

      <div className="auth-field">
        <label htmlFor="login-username">Username</label>
        <input
          id="login-username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>

      <div className="auth-field">
        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="auth-submit">
        Sign in
      </button>

      <p className="auth-switch">
        Don't have an account?{' '}
        <button type="button" className="auth-link" onClick={onSwitchToRegister}>
          Sign up
        </button>
      </p>
    </form>
  )
}