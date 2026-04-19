import type { User } from '@/context/UserContext.tsx'
import { checkSetupNeeded } from '@/hooks/useLogin.tsx'
import Home from '@/pages/home/Home.tsx'
import { Route as DashboardRoute } from '@/routes/_protected/dashboard/index'
import {
  Outlet,
  createRootRouteWithContext,
  redirect,
  useLocation,
} from '@tanstack/react-router'

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

    if (isSetupPage || isLoginPage) return

    const user = JSON.parse(window.localStorage.getItem('user') ?? '{}') as User

    if (!context.user?.email && !user?.email) {
      throw redirect({ to: '/login', search: { from: location.pathname } })
    }

    if (location.pathname === '/') {
      throw redirect({ to: DashboardRoute.to })
    }
  },
  component: RootLayout,
  notFoundComponent: Home,
})

function RootLayout() {
  useLocation()
  const pathname = window.location.pathname
  const isAuthPage =
    pathname === '/login' || pathname === '/signup' || pathname.startsWith('/setup')

  if (isAuthPage) {
    return <Outlet />
  }

  return <Outlet />
}

// Call this after successful setup so the next navigation doesn't re-check
export const invalidateSetupCache = () => {
  setupChecked = false
  needsSetup = false
}
