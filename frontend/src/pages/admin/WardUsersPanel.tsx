import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { type UserRecord, useUpdateUser, useUsers, useWardUsers } from '@/hooks/useUsers'
import { ALL_ROLES, ROLE_LABELS, isAdmin as checkIsAdmin } from '@/lib/roles'
import React, { useState } from 'react'

type Props = {
  wardId: number
  wardName: string
  /** Roles the current user is allowed to grant/revoke */
  grantableRoles: string[]
  /** Whether the current user can add users from outside the ward */
  canAddUsers: boolean
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

      {wardUsers.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">No users assigned yet.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="pb-1 pr-4 font-medium">User ID</th>
              <th className="pb-1 pr-4 font-medium">Email</th>
              <th className="pb-1 pr-4 font-medium">Roles</th>
              <th className="pb-1 pr-4 font-medium">Ward ID</th>
              <th className="pb-1 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {wardUsers.map((user) => (
              <React.Fragment key={user.id}>
                <tr className="border-b last:border-0 align-top">
                  <td className="py-2 pr-4 text-muted-foreground">{user.id}</td>
                  <td className="py-2 pr-4 font-medium">{user.email}</td>
                  <td className="py-2 pr-4">
                    {editingId === user.id ? (
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
                    ) : (
                      <span>{user.roles.map((r) => ROLE_LABELS[r] ?? r).join(', ')}</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {checkIsAdmin(user.roles) ? '—' : (user.wardId ?? wardId)}
                  </td>
                  <td className="py-2">
                    {editingId === user.id ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(user)}>Save</Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                      </div>
                    ) : !checkIsAdmin(user.roles) ? (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => startEdit(user)}>
                          Edit Roles
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleRemove(user)}>
                          Remove
                        </Button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}

      {canAddUsers && unassigned.length > 0 && (
        <div className="flex items-center gap-2 pt-1">
          <Select value={addUserId} onValueChange={setAddUserId}>
            <SelectTrigger className="flex-1">
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
    </div>
  )
}

export default WardUsersPanel
