import type { ColumnDef } from '@tanstack/react-table'
import { Trash2 } from 'lucide-react'
import type React from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import useUser from '@/context/useUser.tsx'
import { useUpdateUser, useUsers } from '@/hooks/useUsers'
import { useCreateWard, useDeleteWard, useWards } from '@/hooks/useWards'
import { isAdmin } from '@/lib/roles'

type WardRow = {
  id: number
  name: string
  userCount: number
  wardAdminEmails: string
}

const WardsOverview = (): React.ReactElement => {
  const { data: wards = [], isLoading: wardsLoading } = useWards()
  const { data: users = [] } = useUsers()
  const { user } = useUser()
  const canDelete = isAdmin(user.roles)
  const createWard = useCreateWard()
  const updateUser = useUpdateUser()
  const deleteWard = useDeleteWard()

  const [newWardName, setNewWardName] = useState('')
  const [newWardAdminId, setNewWardAdminId] = useState('')
  const [formError, setFormError] = useState('')
  const [deletingWard, setDeletingWard] = useState<WardRow | null>(null)

  const handleDeleteWard = async () => {
    if (deletingWard == null) return
    await deleteWard.mutateAsync(deletingWard.id)
    setDeletingWard(null)
  }

  const wardColumns: ColumnDef<WardRow>[] = [
    { accessorKey: 'name', header: 'Ward' },
    { accessorKey: 'userCount', header: 'Users' },
    {
      accessorKey: 'wardAdminEmails',
      header: 'Ward Admin',
      cell: ({ row }) =>
        row.original.wardAdminEmails || (
          <span className="italic text-muted-foreground">None assigned</span>
        ),
    },
    {
      id: 'actions',
      header: 'Actions',
      enableGlobalFilter: false,
      enableSorting: false,
      cell: ({ row }) =>
        canDelete && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDeletingWard(row.original)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        ),
    },
  ]

  // System admins keep their own role; anyone else can be handed a new ward.
  const assignableUsers = users.filter((u) => !isAdmin(u.roles))

  const wardRows: WardRow[] = wards.map((ward) => {
    const wardUsers = users.filter((u) => u.wardId === ward.id)
    const wardAdmins = wardUsers.filter((u) => u.roles.includes('ward_admin'))
    return {
      id: ward.id ?? 0,
      name: ward.name,
      userCount: wardUsers.length,
      wardAdminEmails: wardAdmins.map((a) => a.email).join(', '),
    }
  })

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
          <DataTable
            columns={wardColumns}
            data={wardRows}
            searchPlaceholder="Search wards..."
          />
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
            <SelectTrigger aria-label="Assign a ward admin">
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
          {formError && <p className="text-sm text-destructive">{formError}</p>}
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

      <Dialog
        open={deletingWard != null}
        onOpenChange={(open) => !open && setDeletingWard(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete ward?</DialogTitle>
            <DialogDescription>
              This will permanently delete &quot;{deletingWard?.name}&quot;
              along with all of its districts, members, users' ward assignments,
              and pending join requests. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeletingWard(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteWard}
              disabled={deleteWard.isPending}
            >
              {deleteWard.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default WardsOverview
