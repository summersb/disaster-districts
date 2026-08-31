import type React from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useUpdateUser, useUsers } from '@/hooks/useUsers'
import { useCreateWard, useWards } from '@/hooks/useWards'
import { isAdmin } from '@/lib/roles'

const WardsOverview = (): React.ReactElement => {
  const { data: wards = [], isLoading: wardsLoading } = useWards()
  const { data: users = [] } = useUsers()
  const createWard = useCreateWard()
  const updateUser = useUpdateUser()

  const [newWardName, setNewWardName] = useState('')
  const [newWardAdminId, setNewWardAdminId] = useState('')
  const [formError, setFormError] = useState('')

  // System admins keep their own role; anyone else can be handed a new ward.
  const assignableUsers = users.filter((u) => !isAdmin(u.roles))

  const handleCreateWard = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormError('')
    const name = newWardName.trim()
    if (!name) return

    try {
      const { id } = await createWard.mutateAsync({ name })
      if (newWardAdminId && id != null) {
        await updateUser.mutateAsync({
          id: Number(newWardAdminId),
          wardId: id,
          roles: ['ward_admin'],
        })
      }
      setNewWardName('')
      setNewWardAdminId('')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create ward')
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Wards</h1>

      <Card className="p-4">
        {wardsLoading ? (
          <p className="text-sm text-muted-foreground">Loading wards...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ward</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Ward Admin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wards.map((ward) => {
                const wardUsers = users.filter((u) => u.wardId === ward.id)
                const wardAdmins = wardUsers.filter((u) =>
                  u.roles.includes('ward_admin'),
                )
                return (
                  <TableRow key={ward.id}>
                    <TableCell className="font-medium">{ward.name}</TableCell>
                    <TableCell>{wardUsers.length}</TableCell>
                    <TableCell>
                      {wardAdmins.length > 0 ? (
                        wardAdmins.map((a) => a.email).join(', ')
                      ) : (
                        <span className="text-muted-foreground italic">
                          None assigned
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="p-4 space-y-3 max-w-md">
        <h2 className="text-sm font-semibold">Create a new ward</h2>
        <form onSubmit={handleCreateWard} className="space-y-3">
          <Input
            placeholder="Ward name"
            value={newWardName}
            onChange={(e) => setNewWardName(e.target.value)}
          />
          <Select value={newWardAdminId} onValueChange={setNewWardAdminId}>
            <SelectTrigger>
              <SelectValue placeholder="Assign a ward admin (optional)" />
            </SelectTrigger>
            <SelectContent>
              {assignableUsers.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formError && <p className="text-sm text-red-500">{formError}</p>}
          <Button
            type="submit"
            disabled={
              createWard.isPending ||
              updateUser.isPending ||
              !newWardName.trim()
            }
          >
            {createWard.isPending || updateUser.isPending
              ? 'Creating...'
              : 'Create Ward'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

export default WardsOverview
