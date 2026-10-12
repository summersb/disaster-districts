import type React from 'react'
import { useEffect, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import useUser from '@/context/useUser.tsx'
import { useJoinRequests } from '@/hooks/useJoinRequests'
import { useWards } from '@/hooks/useWards'
import { GRANTABLE_ROLES, isAdmin } from '@/lib/roles'
import DistrictLeaderAccess from './DistrictLeaderAccess'
import ManageRequests from './ManageRequests'
import WardUsersPanel from './WardUsersPanel'

const AdminDashboard = (): React.ReactElement => {
  const { user } = useUser()
  const { data: allWards = [], isLoading: wardsLoading } = useWards()
  const [selectedWardId, setSelectedWardId] = useState('')

  // System admins can manage any ward; ward admins are scoped to their own.
  const wards = isAdmin(user.roles)
    ? allWards
    : allWards.filter((w) => w.id === user.wardId)

  useEffect(() => {
    if (!selectedWardId && wards.length > 0 && wards[0].id != null) {
      setSelectedWardId(String(wards[0].id))
    }
  }, [selectedWardId, wards])

  const selectedWard = wards.find((w) => String(w.id) === selectedWardId)
  const { data: requests = [] } = useJoinRequests()
  const pendingForWard = requests.filter(
    (request) => request.wardId === selectedWard?.id,
  ).length

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="space-y-4">
        <Select
          value={selectedWardId}
          onValueChange={setSelectedWardId}
          disabled={!isAdmin(user.roles)}
        >
          <SelectTrigger className="w-64" aria-label="Select a ward">
            <SelectValue
              placeholder={wardsLoading ? 'Loading wards...' : 'Select a ward'}
            />
          </SelectTrigger>
          <SelectContent>
            {wards.map((ward) => (
              <SelectItem key={ward.id} value={String(ward.id)}>
                {ward.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedWard && (
          // People who signed up and asked to join this ward. Approving one
          // adds the account to the ward's users below.
          <section className="space-y-2" data-testid="ward-access-requests">
            <h2 className="text-lg font-semibold">
              Access Requests ({pendingForWard})
            </h2>
            <ManageRequests wardId={selectedWard.id} />
          </section>
        )}

        {selectedWard && <DistrictLeaderAccess wardId={selectedWard.id ?? 0} />}

        {selectedWard ? (
          <WardUsersPanel
            wardId={selectedWard.id ?? 0}
            wardName={selectedWard.name}
            grantableRoles={GRANTABLE_ROLES}
            canAddUsers
          />
        ) : (
          !wardsLoading && (
            <p className="text-sm text-muted-foreground">No wards available.</p>
          )
        )}
      </div>
    </div>
  )
}

export default AdminDashboard
