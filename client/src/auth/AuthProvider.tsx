import { useEffect, useState, type ReactNode } from 'react'
import { AuthContext } from './AuthContext'
import { getToken, clearToken, AUTH_EXPIRED_EVENT } from '../api/client'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(getToken())

  function login() {
    setTokenState(getToken())
  }

  function logout() {
    clearToken()
    setTokenState(null)
  }

  // authFetch fires this when the server answers 401 (expired or invalid
  // token). It already cleared the stored token, so here we just sync the
  // React state and go to the login page.
  useEffect(() => {
    function handleAuthExpired() {
      setTokenState(null)
    }

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired)
  }, [])
  
  // The token can change in another page of the extension (e.g. login in
  // the popup while the tab is open). localStorage fires "storage" in the
  // other pages, so we re-read it here. key === null means clear().
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === 'token' || e.key === null) {
        setTokenState(getToken())
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}