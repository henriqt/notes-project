import { useState, type ReactNode } from 'react'
import { AuthContext } from './AuthContext'
import { getToken, setToken as saveToken, clearToken } from '../api/client'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(getToken())

  function login(newToken: string) {
    saveToken(newToken)
    setTokenState(newToken)
  }

  function logout() {
    clearToken()
    setTokenState(null)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}