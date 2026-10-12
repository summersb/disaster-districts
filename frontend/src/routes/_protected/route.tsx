import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { useEffect } from 'react'
import Sidebar from '@/components/Sidebar.tsx'
import type { User } from '@/context/UserContext.tsx'
import useUser from '@/context/useUser.tsx'
import { useSession } from '@/hooks/useSession'

export const Route = createFileRoute('/_protected')({
  beforeLoad: ({ location, context }) => {
    const user = JSON.parse(window.localStorage.getItem('user') ?? '{}') as User

    // If user is not authenticated and not on login, redirect
    if (!context.user?.email && !user?.email) {
      throw redirect({ to: '/login', search: { from: location.pathname } })
    }
  },
  component: MainLayout,
})

function MainLayout() {
  const { user } = useUser()
  const navigate = useNavigate()
  const { refresh } = useSession()

  // Pick up wards and roles granted or removed since the last sign-in.
  useEffect(() => {
    refresh().catch(() => {})
  }, [refresh])

  if (!user.email) {
    navigate({ to: '/login' }).catch((_err) => {})
    return null
  }
  return (
    <div className="h-screen print:h-auto">
      <div className="bg-gray-800 text-white w-64 p-2 fixed top-0 left-0 bottom-0 overflow-y-auto print:hidden">
        <Sidebar user={user} />
      </div>
      <main className="bg-background dark:bg-gray-900 h-full overflow-y-auto p-4 ml-64 print:h-auto print:w-full print:ml-0 print:p-0">
        <Outlet />
      </main>
    </div>
  )
}
