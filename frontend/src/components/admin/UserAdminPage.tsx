import type React from 'react'
import useUser from '@/context/useUser'
import WardUsersPanel from './WardUsersPanel'

const UserAdminPage = (): React.ReactElement => {
  const { user } = useUser()
  const wardId = user.wardId ?? 0
  const wardName = 'Ward'
  const grantableRoles = ['member', 'admin']
  const canAddUsers = true

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">User Administration</h1>
      <WardUsersPanel wardId={wardId} wardName={wardName} grantableRoles={grantableRoles} canAddUsers={canAddUsers} />
    </div>
  )
}

export default UserAdminPage
