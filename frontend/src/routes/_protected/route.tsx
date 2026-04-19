import type { User } from '@/context/UserContext.tsx'
import useUser from '@/context/useUser.tsx'
import Home from '@/pages/home/Home.tsx'
import Sidebar from '@/pages/nav/Sidebar.tsx'
import {
  Outlet,
  createFileRoute,
  redirect,
  useNavigate,
} from '@tanstack/react-router'

export const Route = createFileRoute('/_protected')({
  beforeLoad: ({ location, context }) => {
    const user = JSON.parse(window.localStorage.getItem('user') ?? '{}') as User
    console.log(
      'protect route layout. before load',
      context.user,
      user,
      location,
    )

    // If user is not authenticated and not on login, redirect
    if (!context.user?.email && !user?.email) {
      console.log('sending to login')
      throw redirect({ to: '/login', search: { from: location.pathname } })
    }
  },
  component: MainLayout,
  notFoundComponent: Home,
})

function MainLayout() {
  const { user } = useUser()
  const navigate = useNavigate()

  console.log('protected layout', user)
  if (!user.email) {
    navigate({ to: '/login' }).catch((err) => {
      console.log(err)
    })
    return null
  }
  return (
    <div className="h-screen print:h-auto">
      root layout
      <div className="bg-gray-800 text-white w-64 p-2 fixed top-0 left-0 bottom-0 overflow-y-auto print:hidden">
        <Sidebar user={user} />
      </div>
      <main className="bg-gray-900 overflow-y-auto p-4 ml-64 print:w-full print:ml-0 print:p-0">
        <Outlet />
      </main>
    </div>
  )
}
