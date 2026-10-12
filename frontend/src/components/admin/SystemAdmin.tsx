import type React from 'react'
import { useJoinRequests } from '@/hooks/useJoinRequests'
import ManageRequests from './ManageRequests'
import WardsOverview from './WardsOverview'

// System-wide administration, independent of any one ward: creating and
// deleting wards, choosing who administers each, and account requests from
// people asking to join a ward. Managing a ward's own users happens inside
// that ward, on its Ward Users page.
const SystemAdmin = (): React.ReactElement => {
  const { data: requests = [] } = useJoinRequests()

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">System Admin</h1>

      <WardsOverview />

      <section className="space-y-2" data-testid="account-requests">
        <h2 className="text-xl font-semibold">
          Account Requests ({requests.length})
        </h2>
        <p className="text-sm text-muted-foreground">
          People who signed up and asked to join a ward. Each ward's admins can
          also approve the requests for their own ward.
        </p>
        <ManageRequests />
      </section>
    </div>
  )
}

export default SystemAdmin
