import { createFileRoute, Link } from '@tanstack/react-router'
import SystemAdmin from '@/components/admin/SystemAdmin.tsx'
import LeaderDashboard from '@/components/districts/LeaderDashboard.tsx'
import WardDashboard from '@/components/ward/WardDashboard.tsx'
import useUser from '@/context/useUser.tsx'
import { useDistrictLeaderScope } from '@/hooks/useDistrictLeaderScope'
import { getWardId } from '@/lib/api'
import { isAdmin } from '@/lib/roles'
import { Route as JoinWardRoute } from '@/routes/_protected/join-ward'

export const Route = createFileRoute('/_protected/dashboard/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { user } = useUser()
  const { leaderOnly, districts: ledDistricts } = useDistrictLeaderScope()

  // A system admin who hasn't stepped into a ward gets the system page;
  // inside a ward they see that ward's dashboard like its own admins do.
  if (isAdmin(user.roles) && !((user.wardId ?? 0) > 0)) {
    return <SystemAdmin />
  }

  // The saved session is the source of truth for the ward (it is what every
  // data request uses); the in-memory user can lag behind it.
  if ((user.wardId ?? getWardId()) > 0) {
    // A district leader's home is their own district, not the whole ward.
    return leaderOnly ? (
      <LeaderDashboard districts={ledDistricts} />
    ) : (
      <WardDashboard />
    )
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
