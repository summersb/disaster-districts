import { createFileRoute, Link } from '@tanstack/react-router'
import WardsOverview from '@/components/admin/WardsOverview.tsx'
import WardDashboard from '@/components/ward/WardDashboard.tsx'
import useUser from '@/context/useUser.tsx'
import { getWardId } from '@/lib/api'
import { isAdmin } from '@/lib/roles'
import { Route as JoinWardRoute } from '@/routes/_protected/join-ward'

export const Route = createFileRoute('/_protected/dashboard/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { user } = useUser()

  if (isAdmin(user.roles)) {
    return <WardsOverview />
  }

  // The saved session is the source of truth for the ward (it is what every
  // data request uses); the in-memory user can lag behind it.
  if ((user.wardId ?? getWardId()) > 0) {
    return <WardDashboard />
  }

  return (
    <div className="p-6 space-y-2">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-sm">
        Your account isn't part of a ward yet.{' '}
        <Link
          to={JoinWardRoute.to}
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          Ask to join a ward
        </Link>{' '}
        to see its dashboard.
      </p>
    </div>
  )
}
