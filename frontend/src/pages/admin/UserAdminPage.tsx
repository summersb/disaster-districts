import useUser from '@/context/useUser.tsx'
import { useWards } from '@/hooks/useWards'
import WardUsersPanel from '@/pages/admin/WardUsersPanel.tsx'
import { isAdmin } from '@/lib/roles'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type React from 'react'
import { useState } from 'react'

// Roles a ward_admin can grant within their own ward
const WARD_ADMIN_GRANTABLE = ['ward_admin', 'district_admin', 'user']
// System admins can grant any role
const ADMIN_GRANTABLE = ['admin', 'ward_admin', 'district_admin', 'user']

const UserAdminPage = (): React.ReactElement => {
  const { user } = useUser()
  const { data: wards } = useWards()
  const [expandedWardId, setExpandedWardId] = useState<number | null>(null)

  const userIsAdmin = isAdmin(user.roles)

  // Ward admins only see their own ward
  const visibleWards = userIsAdmin
    ? (wards ?? [])
    : (wards ?? []).filter((w) => (w as any).id === user.wardId)

  const grantableRoles = userIsAdmin ? ADMIN_GRANTABLE : WARD_ADMIN_GRANTABLE

  const toggle = (id: number) =>
    setExpandedWardId((prev) => (prev === id ? null : id))

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">User Administration</h1>

      {visibleWards.length === 0 && (
        <p className="text-muted-foreground italic">
          {userIsAdmin ? 'No wards exist yet.' : 'You are not assigned to a ward.'}
        </p>
      )}

      <div className="space-y-2">
        {visibleWards.map((ward) => {
          const wardId = (ward as any).id as number
          const isExpanded = expandedWardId === wardId

          return (
            <div key={wardId} className="rounded border">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted/50"
                onClick={() => toggle(wardId)}
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span className="font-medium">{ward.name}</span>
              </button>

              {isExpanded && (
                <div className="border-t px-4 pb-4 pt-3">
                  <WardUsersPanel
                    wardId={wardId}
                    wardName={ward.name ?? ''}
                    grantableRoles={grantableRoles}
                    canAddUsers={userIsAdmin}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default UserAdminPage
