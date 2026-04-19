import { Button } from '@/components/ui/button'
import { type UserRecord, useUpdateUser, useUsers, useWardUsers } from '@/hooks/useUsers'
import { ALL_ROLES, ROLE_LABELS, isAdmin as checkIsAdmin } from '@/lib/roles'
import type React from 'react'
import { useState } from 'react'

type Props = {
  wardId: number
  wardName: string
  /** Roles the current user is allowed to grant/revoke */
  grantableRoles: string[]
  /** Whether the current user can add users from outside the ward */
  canAddUsers: boolean
}

const RolePill = ({ role }: { role: string }) => {
  const colors: Record<string, string> = {
    admin: 'bg-purple-700 text-white',
    ward_admin: 'bg-blue-700 text-white',
    district_admin: 'bg-teal-700 text-white',
    user: 'bg-gray-600 text-gray-200',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[role] ?? 'bg-gray-600 text-gray-200'}`}>
      {ROLE_LABELS[role] ?? role}
    </span>
  )
}

const WardUsersPanel = ({ wardId, wardName, grantableRoles, canAddUsers }: Props): React.ReactElement => {
  const { data: wardUsers = [], isLoading } = useWardUsers(wardId)
  const { data: allUsers = [] } = useUsers()
  const updateUser = useUpdateUser()
  const [addUserId, setAddUserId] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editRoles, setEditRoles] = useState<string[]>([])

  const unassigned = allUsers.filter((u) => !u.wardId || u.wardId !== wardId)

  const startEdit = (user: UserRecord) => {
    setEditingId(user.id)
    setEditRoles([...user.roles])
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditRoles([])
  }

  const saveEdit = (user: UserRecord) => {
    // Preserve roles the current user can't manage (e.g. ward_admin can't touch 'admin')
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

  const handleRemove = (user: UserRecord) => {
    updateUser.mutate({ id: user.id, removeFromWard: true, roles: ['user'] })
  }

  const toggleEditRole = (role: string) => {
    setEditRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    )
  }

  if (isLoading) return <p className="text-sm text-muted-foreground p-2">Loading...</p>

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">{wardName}</p>

      {wardUsers.length === 0 && (
        <p className="text-sm italic text-muted-foreground">No users assigned yet.</p>
      )}

      <div className="space-y-1">
        {wardUsers.map((user) => (
          <div key={user.id} className="rounded border px-3 py-2 text-sm space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex-1 truncate font-medium">{user.email}</span>
              <div className="flex gap-1 flex-wrap">
                {user.roles.map((r) => <RolePill key={r} role={r} />)}
              </div>
              {editingId !== user.id && !checkIsAdmin(user.roles) && (
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => startEdit(user)}>
                    Edit Roles
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleRemove(user)}>
                    Remove
                  </Button>
                </div>
              )}
            </div>

            {editingId === user.id && (
              <div className="border-t pt-2 space-y-2">
                <p className="text-xs text-muted-foreground">Assign roles:</p>
                <div className="flex flex-wrap gap-3">
                  {ALL_ROLES.filter((r) => grantableRoles.includes(r)).map((role) => (
                    <label key={role} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editRoles.includes(role)}
                        onChange={() => toggleEditRole(role)}
                      />
                      {ROLE_LABELS[role]}
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveEdit(user)}>Save</Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {canAddUsers && unassigned.length > 0 && (
        <div className="flex items-center gap-2 pt-1">
          <select
            className="flex-1 rounded border bg-background px-3 py-1.5 text-sm"
            value={addUserId}
            onChange={(e) => setAddUserId(e.target.value)}
          >
            <option value="">Add a user to this ward…</option>
            {unassigned.map((u) => (
              <option key={u.id} value={String(u.id)}>
                {u.email}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={handleAdd} disabled={!addUserId}>
            Add
          </Button>
        </div>
      )}
    </div>
  )
}

export default WardUsersPanel
