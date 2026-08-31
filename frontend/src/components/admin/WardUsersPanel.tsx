import type { ColumnDef } from '@tanstack/react-table'
import type React from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUpdateUser, useUsers, useWardUsers } from '@/hooks/useUsers'
import { ALL_ROLES, isAdmin as checkIsAdmin, ROLE_LABELS } from '@/lib/roles'
import type { UserDto } from '@/type'

type Props = {
  wardId: number
  wardName: string
  /** Roles the current user is allowed to grant/revoke */
  grantableRoles: string[]
  /** Whether the current user can add users from outside the ward */
  canAddUsers: boolean
}

const WardUsersPanel = ({
  wardId,
  wardName,
  grantableRoles,
  canAddUsers,
}: Props): React.ReactElement => {
  const { data: wardUsers = [], isLoading } = useWardUsers(wardId)
  const { data: allUsers = [] } = useUsers()
  const updateUser = useUpdateUser()
  const [addUserId, setAddUserId] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editRoles, setEditRoles] = useState<string[]>([])

  const unassigned = allUsers.filter((u) => !u.wardId || u.wardId !== wardId)

  const startEdit = (user: UserDto) => {
    setEditingId(user.id)
    setEditRoles([...user.roles])
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditRoles([])
  }

  const saveEdit = (user: UserDto) => {
    const unmanaged = user.roles.filter((r) => !grantableRoles.includes(r))
    const managed = editRoles.filter((r) => grantableRoles.includes(r))
    const merged = [...new Set([...unmanaged, ...managed])]
    updateUser.mutate({ id: user.id, roles: merged.length ? merged : ['user'] })
    cancelEdit()
  }

  const handleAdd = () => {
    if (!addUserId) return
    updateUser.mutate({ id: Number(addUserId), wardId })
    setAddUserId('')
  }

  const handleRemove = (user: UserDto) => {
    updateUser.mutate({ id: user.id, removeFromWard: true, roles: ['user'] })
  }

  const toggleEditRole = (role: string) => {
    setEditRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    )
  }

  const columns: ColumnDef<UserDto>[] = [
    { accessorKey: 'id', header: 'User ID' },
    { accessorKey: 'email', header: 'Email' },
    {
      id: 'roles',
      header: 'Roles',
      accessorFn: (user) =>
        user.roles.map((r) => ROLE_LABELS[r] ?? r).join(', '),
      cell: ({ row }) => {
        const user = row.original
        if (editingId !== user.id) {
          return (
            <span>{user.roles.map((r) => ROLE_LABELS[r] ?? r).join(', ')}</span>
          )
        }
        return (
          <div className="flex flex-wrap gap-3">
            {ALL_ROLES.filter((r) => grantableRoles.includes(r)).map((role) => (
              <label
                key={role}
                className="flex items-center gap-1.5 text-xs cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={editRoles.includes(role)}
                  onChange={() => toggleEditRole(role)}
                />
                {ROLE_LABELS[role]}
              </label>
            ))}
          </div>
        )
      },
    },
    {
      id: 'ward',
      header: 'Ward',
      accessorFn: (user) => (checkIsAdmin(user.roles) ? '' : wardName),
      cell: ({ row }) => (checkIsAdmin(row.original.roles) ? '—' : wardName),
    },
    {
      id: 'actions',
      header: 'Actions',
      enableGlobalFilter: false,
      cell: ({ row }) => {
        const user = row.original
        if (editingId === user.id) {
          return (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => saveEdit(user)}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={cancelEdit}>
                Cancel
              </Button>
            </div>
          )
        }
        if (checkIsAdmin(user.roles)) return null
        return (
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => startEdit(user)}>
              Edit Roles
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleRemove(user)}
            >
              Remove
            </Button>
          </div>
        )
      },
    },
  ]

  if (isLoading)
    return <p className="text-sm text-muted-foreground p-2">Loading...</p>

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">{wardName}</p>

      {canAddUsers && unassigned.length > 0 && (
        <div className="flex items-center gap-2 pt-1">
          <Select value={addUserId} onValueChange={setAddUserId}>
            <SelectTrigger
              className="flex-1"
              aria-label="Add a user to this ward"
            >
              <SelectValue placeholder="Add a user to this ward…" />
            </SelectTrigger>
            <SelectContent>
              {unassigned.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleAdd} disabled={!addUserId}>
            Add
          </Button>
        </div>
      )}

      {wardUsers.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">
          No users assigned yet.
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={wardUsers}
          searchPlaceholder="Search users..."
        />
      )}
    </div>
  )
}

export default WardUsersPanel
