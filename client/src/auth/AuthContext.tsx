import { createContext } from 'react'

export interface AuthContextValue {
  isAuthenticated: boolean
  login: () => void // re-reads the token after the login form saved it
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)