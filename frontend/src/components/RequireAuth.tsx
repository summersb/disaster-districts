import * as React from 'react'
import { Navigate, Outlet, useLocation } from '@tanstack/react-router'
import useAuth from '@/hooks/useAuth'

const RequireAuth = (): React.ReactElement => {
  const { user } = useAuth()
  const location = useLocation()

  if (!user?.email) {
    // Redirect to login, but remember where we were going (pathname only)
    // TanStack Navigate supports a `from` prop for this pattern.
    return <Navigate to="/login" from={location.pathname} replace />
  }

  return <Outlet />
}

export default RequireAuth
