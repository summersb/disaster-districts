import { Link, useNavigate } from '@tanstack/react-router'
import type React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSession } from '@/hooks/useSession'
import { isAdmin, ROLE_LABELS } from '@/lib/roles'
import { NO_WARD } from '@/lib/session'
import { Route as DashboardRoute } from '@/routes/_protected/dashboard'
import { Route as JoinWardRoute } from '@/routes/_protected/join-ward'

// The most significant role, for the one-line "you are here as ..." label.
const ROLE_ORDER = ['admin', 'ward_admin', 'district_leader']

// "Signed in as Ward Admin", or a plain statement that the account has no
// access to this ward yet.
const standing = (roles: string[] | undefined) => {
  const role = ROLE_ORDER.find((r) => roles?.includes(r))
  return role ? `Signed in as ${ROLE_LABELS[role] ?? role}` : 'No access yet'
}

// Shows which ward the session is in and in what capacity, and lets a user
// who has more than one ward (or a system admin, who can enter any) switch.
const WardSwitcher = (): React.ReactElement | null => {
  const { user, switchWard } = useSession()
  const navigate = useNavigate()
  const systemAdmin = isAdmin(user.roles)
  const wards = user.wards ?? []
  const current = wards.find((ward) => ward.id === user.wardId)

  const change = async (value: string) => {
    await switchWard(Number(value))
    // Whatever page was open belonged to the ward being left.
    await navigate({ to: DashboardRoute.to })
  }

  if (!systemAdmin && wards.length === 0) return null

  const canSwitch = systemAdmin || wards.length > 1

  return (
    <div className="space-y-1" data-testid="ward-switcher">
      <p className="text-xs uppercase tracking-wide text-gray-300">Ward</p>
      {canSwitch ? (
        <Select value={String(user.wardId ?? NO_WARD)} onValueChange={change}>
          <SelectTrigger
            className="w-full bg-gray-900 text-white dark:bg-gray-900"
            aria-label="Switch ward"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {systemAdmin && (
              <SelectItem value={String(NO_WARD)}>
                All wards (system admin)
              </SelectItem>
            )}
            {wards.map((ward) => (
              <SelectItem key={ward.id} value={String(ward.id)}>
                {ward.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <p className="font-semibold">{current?.name}</p>
      )}
      <p className="text-xs text-gray-300">
        {systemAdmin ? 'System Admin' : standing(current?.roles)}
        {!systemAdmin && (
          <>
            {' · '}
            <Link to={JoinWardRoute.to} className="underline">
              Join another ward
            </Link>
          </>
        )}
      </p>
    </div>
  )
}

export default WardSwitcher
