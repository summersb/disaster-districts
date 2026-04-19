import UserAdminPage from '@/pages/admin/UserAdminPage.tsx'
import { canManageUsers } from '@/lib/roles'
import { Route as DashboardRoute } from '@/routes/_protected/dashboard'
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/user-admin/')({
  beforeLoad: () => {
    const stored = JSON.parse(window.localStorage.getItem('user') ?? '{}')
    if (!canManageUsers(stored?.roles)) {
      throw redirect({ to: DashboardRoute.to })
    }
  },
  component: UserAdminPage,
})
