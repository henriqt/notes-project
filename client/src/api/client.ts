const API_BASE = 'https://localhost:7269/api'

export function getToken(): string | null {
  return localStorage.getItem('token')
}

export function setToken(token: string): void {
  localStorage.setItem('token', token)
}

export function clearToken(): void {
  localStorage.removeItem('token')
}

// Wraps fetch to attach the JWT and redirect to /login on 401,
// same behavior as the old authFetch() in app.js
export async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (response.status === 401) {
    clearToken()
    window.location.href = '/login'
  }

  return response
}