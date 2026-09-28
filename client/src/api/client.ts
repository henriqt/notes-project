export const API_BASE = 'https://localhost:7269/api'

// Fired when the API answers 401, so AuthProvider can log out
export const AUTH_EXPIRED_EVENT = 'auth:expired'

// Reads the token payload. It doesn't check the signature, the server does that.
function readPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

// A token we can't read counts as expired
function isTokenExpired(token: string): boolean {
  const payload = readPayload(token)
  if (!payload) return true
  return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()
}

// Returns null (and clears it) if the token expired
export function getToken(): string | null {
  const token = localStorage.getItem('token')
  if (token && isTokenExpired(token)) {
    clearToken()
    return null
  }
  return token
}

// Account id from the token, or undefined if it can't be read
export function getTokenUserId(): string | undefined {
  const token = localStorage.getItem('token')
  if (!token) return undefined

  const payload = readPayload(token)
  if (!payload) return undefined

  // The claim key is a long URL, so match by the end of it
  const key = Object.keys(payload).find((k) => k.endsWith('/nameidentifier'))
  const id = (key ? payload[key] : undefined) ?? payload.nameid ?? payload.sub

  return id === undefined || id === null ? undefined : String(id)
}

export function setToken(token: string): void {
  localStorage.setItem('token', token)
}

export function clearToken(): void {
  localStorage.removeItem('token')
}

// fetch with the JWT header. On 401 it clears the token and fires AUTH_EXPIRED_EVENT.
// No window.location here: inside the extension the router handles navigation.
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
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
  }

  return response
}