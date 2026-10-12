import { createFileRoute, redirect } from '@tanstack/react-router'
import SystemAdmin from '@/components/admin/SystemAdmin.tsx'
import { isAdmin } from '@/lib/roles'
import { Route as DashboardRoute } from '@/routes/_protected/dashboard'

// System administration - system admins only. A ward admin manages their own
// ward from its Ward Users page instead.
export const Route = createFileRoute('/_protected/admin/')({
  beforeLoad: () => {
    const stored = JSON.parse(window.localStorage.getItem('user') ?? '{}')
    if (!isAdmin(stored?.roles)) {
      throw redirect({ to: DashboardRoute.to })
    }
  },
  component: SystemAdmin,
})
