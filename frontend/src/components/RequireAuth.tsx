import * as React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuth from '@/hooks/useAuth'

const RequireAuth = (): React.ReactElement => {
  const { user } = useAuth()
  const location = useLocation()

  if (!user?.email) {
    // Redirect to login, but remember where we were going
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}

export default RequireAuth
