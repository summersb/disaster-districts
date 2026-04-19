import AdminDashboard from '@/pages/admin/AdminDashboard.tsx'
import { isAdmin } from '@/lib/roles'
import { Route as DashboardRoute } from '@/routes/_protected/dashboard'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Suspense } from 'react'

export const Route = createFileRoute('/_protected/admin/')({
  beforeLoad: () => {
    const stored = JSON.parse(window.localStorage.getItem('user') ?? '{}')
    if (!isAdmin(stored?.roles)) {
      throw redirect({ to: DashboardRoute.to })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminDashboard />
    </Suspense>
  )
}
