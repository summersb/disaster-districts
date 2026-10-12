import { Link, redirect } from '@tanstack/react-router'
import {
  HardDriveUpload,
  LayoutDashboard,
  Map as MapIcon,
  Rows3,
  School,
  School2,
  Settings,
  ShieldCheck,
  User,
  UserCog,
  Users,
} from 'lucide-react'
import type React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import WardSwitcher from '@/components/WardSwitcher'
import type { User as UserType } from '@/context/UserContext.tsx'
import useUser from '@/context/useUser.tsx'
import { useDistrictLeaderScope } from '@/hooks/useDistrictLeaderScope'
import { useJoinRequests } from '@/hooks/useJoinRequests'
import { useLocalStorageState } from '@/hooks/useLocalStorageState'
import { canManageUsers, isAdmin } from '@/lib/roles'
import { cn } from '@/lib/utils'
import { Route as AdminRoute } from '@/routes/_protected/admin'
import { Route as DashboardRoute } from '@/routes/_protected/dashboard'
import { Route as DashboardMapRoute } from '@/routes/_protected/dashboard/map'
import { Route as DistrictRoute } from '@/routes/_protected/district'
import { Route as DistrictRouteAdd } from '@/routes/_protected/district/add'
import { Route as MemberRoute } from '@/routes/_protected/member'
import { Route as MemberRouteAdd } from '@/routes/_protected/member/add'
import { Route as PrintRoute } from '@/routes/_protected/print'
import { Route as SettingsRoute } from '@/routes/_protected/settings'
import { Route as UploadRoute } from '@/routes/_protected/upload'
import { Route as WardUsersRoute } from '@/routes/_protected/ward-users'
import { Route as LoginRoute } from '@/routes/login'

type Props = {
  user: UserType
}

// One menu line: icon and label on a row, with space between them.
const row = 'flex flex-row items-center gap-2'

const Badge = ({ count, title }: { count: number; title: string }) =>
  count > 0 ? (
    <span
      className="rounded-full bg-blue-600 px-2 text-xs font-semibold"
      title={title}
      data-testid="pending-requests-badge"
    >
      {count}
    </span>
  ) : null

const Sidebar = ({ user }: Props): React.ReactElement => {
  const auth = useUser()
  const [, setUser] = useLocalStorageState<UserType>('user', undefined)
  const { leaderOnly } = useDistrictLeaderScope()
  const systemAdmin = isAdmin(user.roles)
  const inWard = (user.wardId ?? 0) > 0
  // Ward admin of the ward the session is in (a system admin counts in any).
  const wardManager = inWard && canManageUsers(user.roles)
  const { data: pendingRequests = [] } = useJoinRequests(
    canManageUsers(user.roles),
  )
  const pendingHere = pendingRequests.filter(
    (request) => request.wardId === user.wardId,
  ).length

  const logout = async () => {
    auth.setUser({})
    setUser({})
    redirect({ to: LoginRoute.to })
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className={row}>
        <Avatar>
          <AvatarImage src={user.avatarUrl ?? ''} />
          <AvatarFallback>
            {user.email?.match(/\b(\w)/g)?.join('')}
          </AvatarFallback>
        </Avatar>
        {user.email}
      </div>
      <div className={row}>
        <img alt="logo" src="/favicon.ico" width={24} height={24} /> Disaster
        Districts
      </div>

      {/* System-wide administration: wards, who administers them, and
          account requests. Not tied to whichever ward is selected below. */}
      {systemAdmin && (
        <div className={row}>
          <ShieldCheck />
          <Link to={AdminRoute.to}>Admin</Link>
          <Badge
            count={pendingRequests.length}
            title="Account requests waiting"
          />
        </div>
      )}

      <WardSwitcher />

      {/* Everything below is about the ward the session is in. */}
      {inWard && (
        <>
          <div className={row}>
            <LayoutDashboard />
            <Link to={DashboardRoute.to}>Dashboard</Link>
          </div>

          {wardManager && (
            <div className={row}>
              <UserCog />
              <Link to={WardUsersRoute.to}>Ward Users</Link>
              <Badge count={pendingHere} title="People waiting for access" />
            </div>
          )}

          {/* A district leader's menu is just their members and map: their
              district, and printing it, are on the dashboard. */}
          {leaderOnly ? (
            <div className={row}>
              <Users />
              <Link to={MemberRoute.to}>Members</Link>
            </div>
          ) : (
            <>
              <div className={row}>
                <School />
                <Link to={DistrictRoute.to}>Districts</Link>
              </div>
              {wardManager && (
                <div className={row}>
                  <School2 />
                  <Link to={DistrictRouteAdd.to}>Add Districts</Link>
                </div>
              )}
              <div className={row}>
                <Rows3 />
                <Link to={PrintRoute.to}>Print Districts</Link>
              </div>
              <div className={row}>
                <Users />
                <Link to={MemberRoute.to}>Members</Link>
              </div>
              {wardManager && (
                <>
                  <div className={row}>
                    <User />
                    <Link to={MemberRouteAdd.to}>Add/Update Members</Link>
                  </div>
                  <div className={row}>
                    <HardDriveUpload />
                    <Link to={UploadRoute.to}>Upload Members</Link>
                  </div>
                </>
              )}
            </>
          )}
          <div className={row}>
            <MapIcon />
            <Link to={DashboardMapRoute.to}>Map</Link>
          </div>
        </>
      )}

      {/* mt-auto pushes Logout and Settings to the bottom, leaving the
          menu items above together. */}
      <div className={cn(row, 'mt-auto')}>
        <Button onClick={logout}>Logout</Button>
      </div>
      <div className={row}>
        <Settings />
        <Link to={SettingsRoute.to}>Settings</Link>
      </div>
    </div>
  )
}

export default Sidebar
