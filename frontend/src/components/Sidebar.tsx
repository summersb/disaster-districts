import { Link, redirect } from '@tanstack/react-router'
import {
  HardDriveUpload,
  LayoutDashboard,
  Map as MapIcon,
  Rows3,
  School,
  School2,
  Settings,
  User,
  Users,
} from 'lucide-react'
import type React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import type { User as UserType } from '@/context/UserContext.tsx'
import useUser from '@/context/useUser.tsx'
import { useLocalStorageState } from '@/hooks/useLocalStorageState'
import { useWard } from '@/hooks/useWards'
import { canManageUsers, isAdmin } from '@/lib/roles'
import { cn } from '@/lib/utils'
import { Route as AdminRoute } from '@/routes/_protected/admin'
import { Route as JoinRequestsRoute } from '@/routes/_protected/admin/join-requests'
import { Route as DashboardRoute } from '@/routes/_protected/dashboard'
import { Route as DashboardMapRoute } from '@/routes/_protected/dashboard/map'
import { Route as DistrictRoute } from '@/routes/_protected/district'
import { Route as DistrictRouteAdd } from '@/routes/_protected/district/add'
import { Route as MemberRoute } from '@/routes/_protected/member'
import { Route as MemberRouteAdd } from '@/routes/_protected/member/add'
import { Route as PrintRoute } from '@/routes/_protected/print'
import { Route as SettingsRoute } from '@/routes/_protected/settings'
import { Route as UploadRoute } from '@/routes/_protected/upload'
import { Route as LoginRoute } from '@/routes/login'

type Props = {
  user: UserType
}

// One menu line: icon and label on a row, with space between them.
const row = 'flex flex-row items-center gap-2'

const Sidebar = ({ user }: Props): React.ReactElement => {
  const auth = useUser()
  const [, setUser] = useLocalStorageState<UserType>('user', undefined)
  const { data: ward } = useWard(user.wardId ?? 0)

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
      <div className={row}>
        <LayoutDashboard />
        <Link to={DashboardRoute.to}>{ward?.name ?? 'Dashboard'}</Link>
      </div>

      {canManageUsers(user.roles) && (
        <div className={row}>
          <Settings />
          <Link to={AdminRoute.to}>Admin</Link>
        </div>
      )}

      {isAdmin(user.roles) && (
        <div className={row}>
          <Users />
          <Link to={JoinRequestsRoute.to}>Ward Requests</Link>
        </div>
      )}

      <div className={row}>
        <School />
        <Link to={DistrictRoute.to}>Districts</Link>
      </div>
      <div className={row}>
        <School2 />
        <Link to={DistrictRouteAdd.to}>Add Districts</Link>
      </div>
      <div className={row}>
        <Rows3 />
        <Link to={PrintRoute.to}>Print Districts</Link>
      </div>
      <div className={row}>
        <Users />
        <Link to={MemberRoute.to}>Members</Link>
      </div>
      <div className={row}>
        <User />
        <Link to={MemberRouteAdd.to}>Add/Update Members</Link>
      </div>
      <div className={row}>
        <HardDriveUpload />
        <Link to={UploadRoute.to}>Upload Members</Link>
      </div>
      <div className={cn(row, 'grow')}>
        <MapIcon />
        <Link to={DashboardMapRoute.to}>Map</Link>
      </div>
      <div className={cn(row, 'grow')}>
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
