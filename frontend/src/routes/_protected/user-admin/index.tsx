import { createFileRoute, redirect } from '@tanstack/react-router'
import { canManageUsers } from '@/lib/roles'
import UserAdminPage from '@/components/admin/UserAdminPage.tsx'
import { Route as DashboardRoute } from '@/routes/_protected/dashboard'

export const Route = createFileRoute('/_protected/user-admin/')({
  beforeLoad: () => {
    const stored = JSON.parse(window.localStorage.getItem('user') ?? '{}')
    if (!canManageUsers(stored?.roles)) {
      throw redirect({ to: DashboardRoute.to })
    }
  },
  component: UserAdminPage,
})
