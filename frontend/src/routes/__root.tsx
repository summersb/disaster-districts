import type { User } from '@/context/UserContext.tsx'
import { checkSetupNeeded } from '@/hooks/useLogin.tsx'
import { Route as DashboardRoute } from '@/routes/_protected/dashboard/index'
import { createRootRouteWithContext, Outlet, redirect, useLocation } from '@tanstack/react-router'
import React, { useEffect } from 'react'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'

// Setup global fetch interceptor to handle 401 responses
const originalFetch = window.fetch
window.fetch = ((...args: Parameters<typeof fetch>) => {
  return originalFetch.apply(window, args).then((response) => {
    if (response.status === 401) {
      // Clear invalid session
      window.localStorage.removeItem('user')
      window.localStorage.removeItem('lastPage')
      // Redirect to login
      window.location.href = '/login'
    }
    return response
  })
}) as typeof fetch

type RouterContext = {
  user: User
}

// Cached per session so we only hit the API once
let setupChecked = false
let needsSetup = false

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ location, context }) => {

    const isSetupPage = location.pathname === '/setup' || location.pathname === '/setup/'
    const isLoginPage = location.pathname === '/login' || location.pathname === '/signup'
    const isJoinWardPage = location.pathname.startsWith('/join-ward')

    if (!setupChecked) {
      needsSetup = await checkSetupNeeded()
      setupChecked = true
    }

    // If no accounts exist yet, force setup
    if (needsSetup && !isSetupPage) {
      throw redirect({ to: '/setup' })
    }

    // Once setup is done, don't let them back to the setup page
    if (!needsSetup && isSetupPage) {
      throw redirect({ to: '/login' })
    }

    if (isSetupPage || isLoginPage) {
      return
    }

    const user = JSON.parse(window.localStorage.getItem('user') ?? '{}') as User

    if (!context.user?.email && !user?.email) {
      throw redirect({ to: '/login', search: { from: location.pathname } })
    }

    // If user has no ward ID (or it's 0), redirect to ward selection (unless already there)
    if ((user?.wardId ?? 0) === 0 && !isJoinWardPage) {
      throw redirect({ to: '/join-ward' })
    }

    if (location.pathname === '/') {
      throw redirect({ to: DashboardRoute.to })
    }

    // Store current page as last visited (but not for login/setup pages)
    if (!isLoginPage && !isSetupPage && location.pathname !== '/') {
      const fullPath = location.pathname + (location.searchStr || '')
      window.localStorage.setItem('lastPage', fullPath)
    }
  },
  component: RootLayout
//  notFoundComponent: Home
})

function RootLayout() {
  const location = useLocation()
  const pathname = window.location.pathname
  const isAuthPage =
    pathname === '/login' || pathname === '/signup' || pathname.startsWith('/setup')

  useEffect(() => {
    // Track the current page for auto-restore on reload
    if (!isAuthPage && pathname !== '/') {
      const fullPath = pathname + location.searchStr
      window.localStorage.setItem('lastPage', fullPath)
    }
  }, [pathname, location.searchStr, isAuthPage])

  if (isAuthPage) {
    return <Outlet />
  }

  return (
    <>
      <div className="print:hidden">
        <TanStackDevtools
          config={{ hideUntilHover: true, position: 'top-right' }}
          plugins={[
            {
              name: 'TanStack Query',
              render: <ReactQueryDevtoolsPanel />
            },
            {
              name: 'TanStack Router',
              render: <TanStackRouterDevtoolsPanel />
            }
          ]}
        />
      </div>
      <Outlet />
    </>)
}

// Call this after successful setup so the next navigation doesn't re-check
export const invalidateSetupCache = () => {
  setupChecked = false
  needsSetup = false
}
