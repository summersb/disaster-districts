import { db } from '@/api'
import { UserRequest } from '@/type/User'
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore'
import React, { useEffect, useState } from 'react'

const ManageRequests = (): React.ReactElement => {
  const [requests, setRequests] = useState<UserRequest[]>([])

  useEffect(() => {
    const fetchRequests = async () => {
      const querySnapshot = await getDocs(collection(db, 'accessRequests'))
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as UserRequest[]
      setRequests(data)
    }

    fetchRequests()
  }, [])

  const handleApprove = async (id: string) => {
    const requestRef = doc(db, 'accessRequests', id)
    await updateDoc(requestRef, {
      status: 'approved',
    })
  }

  const handleReject = async (id: string) => {
    const requestRef = doc(db, 'accessRequests', id)
    await updateDoc(requestRef, {
      status: 'rejected',
    })
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
