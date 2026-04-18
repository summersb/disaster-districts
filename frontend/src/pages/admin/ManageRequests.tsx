import type { UserRequest } from '@/type/User'
import type React from 'react'
import { useState } from 'react'

const ManageRequests = (): React.ReactElement => {
  const [requests] = useState<UserRequest[]>([])

  const handleApprove = async (_id: number) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
  }

  const handleReject = async (_id: number) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
  }

  return (
    <div>
      {requests.map((request) => (
        <li key={request.id}>
          {request.email} - {request.status}
          {request.status === 'pending' && (
            <>
              <button onClick={() => handleApprove(request.id)}>Approve</button>
              <button onClick={() => handleReject(request.id)}>Reject</button>
            </>
          )}
        </li>
      ))}
    </div>
  )
}

export default ManageRequests
