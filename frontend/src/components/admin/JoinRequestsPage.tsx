import type React from 'react'
import ManageRequests from './ManageRequests'

const JoinRequestsPage = (): React.ReactElement => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Join Requests</h1>
      <ManageRequests />
    </div>
  )
}

export default JoinRequestsPage
