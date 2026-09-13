import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

// Wraps routes that require login. Redirects to /login if not authenticated,
// same behavior as the old enforceAuth() in app.js
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}