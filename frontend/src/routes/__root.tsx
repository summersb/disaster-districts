import type { User } from '@/context/UserContext.tsx'
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

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: ({ location, context }) => {
    const isLoginPage =
      location.pathname === '/login' || location.pathname === '/signup'

    const user = JSON.parse(window.localStorage.getItem('user') ?? '{}') as User
    console.log(
      'root layout. before load',
      context.user,
      user,
      isLoginPage,
      location,
    )

    // If user is not authenticated and not on login, redirect
    if (!context.user?.email && !user?.email && !isLoginPage) {
      console.log('sending to login')
      throw redirect({ to: '/login', search: { from: location.pathname } })
    }

    if (location.pathname === '/') {
      console.log('sending to dashboard')
      throw redirect({ to: DashboardRoute.to })
    }
  },
  component: RootLayout,
  notFoundComponent: Home,
})

function RootLayout() {
  const location = useLocation()
  const pathname = window.location.pathname
  const isLoginPage = pathname === '/login' || pathname === '/signup'

  // For login/signup, render the page directly (no layout)
  if (isLoginPage) {
    console.log('root layout', 'showing login', location.href, pathname)
    return <Outlet />
  }

  console.log('root layout', location.href, pathname)
  return <Outlet />
}
