import type React from 'react'
import useUser from '@/context/useUser.tsx'
import { useJoinRequests } from '@/hooks/useJoinRequests'
import { useWard } from '@/hooks/useWards'
import { GRANTABLE_ROLES } from '@/lib/roles'
import DistrictLeaderAccess from './DistrictLeaderAccess'
import ManageRequests from './ManageRequests'
import WardUsersPanel from './WardUsersPanel'

// Access to one ward - the one the session is in: people asking to join it,
// which district leaders can sign in, and everyone who already has access.
const WardUsers = (): React.ReactElement => {
  const { user } = useUser()
  const wardId = user.wardId ?? 0
  const { data: ward } = useWard(wardId)
  const { data: requests = [] } = useJoinRequests()
  const pending = requests.filter((request) => request.wardId === wardId).length

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Ward Users</h1>

      {/* People who signed up and asked to join this ward. Approving one
          adds the account to the ward's users below. */}
      <section className="space-y-2" data-testid="ward-access-requests">
        <h2 className="text-lg font-semibold">Access Requests ({pending})</h2>
        <ManageRequests wardId={wardId} />
      </section>

      <DistrictLeaderAccess wardId={wardId} />

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Users</h2>
        <p className="text-sm text-muted-foreground">
          An account has access to this ward only as a ward admin, or as a
          district leader - which it becomes once it is linked to the member who
          leads or assists a district. An account that is neither can sign in
          but sees nothing here.
        </p>
        <WardUsersPanel
          wardId={wardId}
          wardName={ward?.name ?? ''}
          grantableRoles={GRANTABLE_ROLES}
          canAddUsers
        />
      </section>
    </div>
  )
}

export default WardUsers
