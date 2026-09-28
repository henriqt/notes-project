import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from './AuthContext'
import { getToken, setToken as saveToken, clearToken, AUTH_EXPIRED_EVENT } from '../api/client'

// Needs to live inside the router (main.tsx: HashRouter > AuthProvider > App)
// because it uses useNavigate.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(getToken())
  const navigate = useNavigate()

  function login(newToken: string) {
    saveToken(newToken)
    setTokenState(newToken)
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
      navigate('/login')
    }

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired)
  }, [navigate])

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}