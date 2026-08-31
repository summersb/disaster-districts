import type React from 'react'
import { useEffect, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import useUser from '@/context/useUser.tsx'
import { useWards } from '@/hooks/useWards'
import { ALL_ROLES, isAdmin } from '@/lib/roles'
import UploadWard from './UploadWard'
import WardUsersPanel from './WardUsersPanel'

const GRANTABLE_ROLES = ALL_ROLES.filter((role) => role !== 'admin')

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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">Ward Users</TabsTrigger>
          <TabsTrigger value="upload">Upload Ward</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="space-y-4">
          <Select
            value={selectedWardId}
            onValueChange={setSelectedWardId}
            disabled={!isAdmin(user.roles)}
          >
            <SelectTrigger className="w-64">
              <SelectValue
                placeholder={
                  wardsLoading ? 'Loading wards...' : 'Select a ward'
                }
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

          {selectedWard ? (
            <WardUsersPanel
              wardId={selectedWard.id ?? 0}
              wardName={selectedWard.name}
              grantableRoles={GRANTABLE_ROLES}
              canAddUsers
            />
          ) : (
            !wardsLoading && (
              <p className="text-sm text-muted-foreground">
                No wards available.
              </p>
            )
          )}
        </TabsContent>
        <TabsContent value="upload">
          <UploadWard />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AdminDashboard
