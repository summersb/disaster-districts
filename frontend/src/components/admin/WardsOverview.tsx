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
import type { UserDto } from '@/type'

type WardRow = {
  id: number
  name: string
  userCount: number
  wardAdminEmails: string
}

// A user's roles in one particular ward (they may hold others elsewhere).
// A system admin is listed against every ward with the role "admin"; that
// isn't a role *in* the ward, so it is left out here.
const rolesIn = (user: UserDto, wardId: number): string[] =>
  (user.wards?.find((ward) => ward.id === wardId)?.roles ?? []).filter(
    (role) => role !== 'admin',
  )

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
  // The ward whose admins are being edited, and the user picked to add.
  const [adminsWardId, setAdminsWardId] = useState<number | null>(null)
  const [newAdminId, setNewAdminId] = useState('')
  const [adminError, setAdminError] = useState('')

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
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setAdminError('')
                setNewAdminId('')
                setAdminsWardId(row.original.id)
              }}
            >
              Ward Admins
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Delete ${row.original.name}`}
              title="Delete"
              onClick={() => setDeletingWard(row.original)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ),
    },
  ]

  // Anyone can be made a ward's admin - including a system admin, who then
  // holds both roles.
  const assignableUsers = users

  const wardRows: WardRow[] = wards.map((ward) => {
    // A user counts for every ward they belong to, not only their first.
    const wardUsers = users.filter((u) => rolesIn(u, ward.id ?? 0).length > 0)
    const wardAdmins = wardUsers.filter((u) =>
      rolesIn(u, ward.id ?? 0).includes('ward_admin'),
    )
    return {
      id: ward.id ?? 0,
      name: ward.name,
      userCount: wardUsers.length,
      wardAdminEmails: wardAdmins.map((a) => a.email).join(', '),
    }
  })

  const adminsWard = wards.find((ward) => ward.id === adminsWardId)
  const currentAdmins = users.filter(
    (u) =>
      adminsWardId != null && rolesIn(u, adminsWardId).includes('ward_admin'),
  )
  const possibleAdmins = assignableUsers.filter(
    (u) => !currentAdmins.some((admin) => admin.id === u.id),
  )

  // Granting makes the user a ward admin of that ward (adding them to it if
  // needed); revoking leaves them in the ward as an ordinary member. Either
  // way their standing in other wards is untouched.
  const setWardAdmin = async (userId: number, grant: boolean) => {
    if (adminsWardId == null) return
    setAdminError('')
    try {
      const res = await updateUser.mutateAsync({
        id: userId,
        wardId: adminsWardId,
        roles: [grant ? 'ward_admin' : 'user'],
      })
      if (!res.ok) throw new Error(`Could not update (${res.status})`)
      setNewAdminId('')
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Could not update')
    }
  }

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
    <section className="space-y-6" data-testid="wards-overview">
      <h2 className="text-xl font-semibold">Wards</h2>

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

      <Dialog
        open={adminsWardId != null}
        onOpenChange={(open) => !open && setAdminsWardId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ward admins of {adminsWard?.name}</DialogTitle>
            <DialogDescription>
              Ward admins manage the ward's members, districts and users.
              Removing someone here leaves their account attached to the ward
              without access, unless they also lead a district.
            </DialogDescription>
          </DialogHeader>
          {currentAdmins.length === 0 ? (
            <p className="text-sm italic text-muted-foreground">
              No ward admins yet.
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {currentAdmins.map((admin) => (
                <li
                  key={admin.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span>
                    {admin.name
                      ? `${admin.name} (${admin.email})`
                      : admin.email}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={updateUser.isPending}
                    aria-label={`Remove ${admin.email} as ward admin`}
                    onClick={() => setWardAdmin(admin.id, false)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-2">
            <Select value={newAdminId} onValueChange={setNewAdminId}>
              <SelectTrigger className="flex-1" aria-label="Add a ward admin">
                <SelectValue placeholder="Add a ward admin…" />
              </SelectTrigger>
              <SelectContent>
                {possibleAdmins.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.name ? `${u.name} (${u.email})` : u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={!newAdminId || updateUser.isPending}
              onClick={() => setWardAdmin(Number(newAdminId), true)}
            >
              Add
            </Button>
          </div>
          {adminError && (
            <p className="text-sm text-destructive">{adminError}</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAdminsWardId(null)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

export default WardsOverview
