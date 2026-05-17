import type React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import useUser from '@/context/useUser'
import WardUsersPanel from './WardUsersPanel'
import UploadWard from './UploadWard'

const AdminDashboard = (): React.ReactElement => {
  const { user } = useUser()
  const wardId = user.wardId ?? 0
  const wardName = 'Ward'
  const grantableRoles = ['member', 'admin']
  const canAddUsers = true

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">Ward Users</TabsTrigger>
          <TabsTrigger value="upload">Upload Ward</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <WardUsersPanel wardId={wardId} wardName={wardName} grantableRoles={grantableRoles} canAddUsers={canAddUsers} />
        </TabsContent>
        <TabsContent value="upload">
          <UploadWard />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AdminDashboard
