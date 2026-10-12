import { createFileRoute, redirect } from '@tanstack/react-router'
import WardUsers from '@/components/admin/WardUsers.tsx'
import { canManageUsers } from '@/lib/roles'
import { Route as DashboardRoute } from '@/routes/_protected/dashboard'

// Who has access to the ward the session is in: for that ward's admins.
export const Route = createFileRoute('/_protected/ward-users/')({
  beforeLoad: () => {
    const stored = JSON.parse(window.localStorage.getItem('user') ?? '{}')
    if (!canManageUsers(stored?.roles) || !((stored?.wardId ?? 0) > 0)) {
      throw redirect({ to: DashboardRoute.to })
    }
  },
  component: WardUsers,
})
