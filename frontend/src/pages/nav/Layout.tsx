import useAuth from '@/hooks/useAuth'
import { Outlet, useLocation } from '@tanstack/react-router'
import Sidebar from '@/pages/nav/Sidebar.tsx'
import { LoginForm } from '@/components/auth/LoginForm.tsx'
import { SignupForm } from '@/components/auth/SignupForm.tsx'

const Layout = () => {
  const { user } = useAuth()
  const location = useLocation()

  if (!user?.email) {
    if (location.pathname === '/signup') {
      return (
        <main className="min-h-screen bg-gray-900 p-4">
          <SignupForm />
        </main>
      )
    }
    // Default to login
    return (
      <main className="min-h-screen bg-gray-900 p-4">
        <LoginForm />
      </main>
    )
  }

  return (
    <div className="h-screen print:h-auto">
      <div className="bg-gray-800 text-white w-64 p-2 fixed top-0 left-0 bottom-0 overflow-y-auto print:hidden">
        <Sidebar />
      </div>
      <main className="bg-gray-900 overflow-y-auto p-4 ml-64 print:w-full print:ml-0 print:p-0">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
