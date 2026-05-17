import { createFileRoute, redirect } from '@tanstack/react-router'
import { Suspense } from 'react'
import { isAdmin } from '@/lib/roles'
import AdminDashboard from '@/components/admin/AdminDashboard.tsx'
import { Route as DashboardRoute } from '@/routes/_protected/dashboard'

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
