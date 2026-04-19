import { Button } from '@/components/ui/button'
import { type UserRecord, useUpdateUser, useUsers, useWardUsers } from '@/hooks/useUsers'
import type React from 'react'
import { useState } from 'react'

type Props = {
  wardId: number
  wardName: string
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'System Admin',
  ward_admin: 'Ward Admin',
  user: 'Member',
}

const RolePill = ({ role }: { role: string }) => {
  const colors: Record<string, string> = {
    admin: 'bg-purple-700 text-white',
    ward_admin: 'bg-blue-700 text-white',
    user: 'bg-gray-600 text-gray-200',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${colors[role] ?? 'bg-gray-600 text-gray-200'}`}>
      {ROLE_LABELS[role] ?? role}
    </span>
  )
}

const WardUsers = ({ wardId, wardName }: Props): React.ReactElement => {
  const { data: wardUsers = [] } = useWardUsers(wardId)
  const { data: allUsers = [] } = useUsers()
  const updateUser = useUpdateUser()
  const [addUserId, setAddUserId] = useState<string>('')

  const unassigned = allUsers.filter((u) => !u.wardId || u.wardId !== wardId)

  const handleAdd = () => {
    if (!addUserId) return
    updateUser.mutate({ id: Number(addUserId), wardId })
    setAddUserId('')
  }

  const handleRemove = (user: UserRecord) => {
    updateUser.mutate({ id: user.id, removeFromWard: true, role: 'user' })
  }

  const handleRoleToggle = (user: UserRecord) => {
    const next = user.role === 'ward_admin' ? 'user' : 'ward_admin'
    updateUser.mutate({ id: user.id, role: next })
  }

  return (
    <div className="mt-3 space-y-3">
      <p className="text-sm font-semibold text-muted-foreground">
        Users in {wardName}
      </p>

      {wardUsers.length === 0 && (
        <p className="text-sm italic text-muted-foreground">No users assigned yet.</p>
      )}

      <div className="space-y-1">
        {wardUsers.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-2 rounded border px-3 py-2 text-sm"
          >
            <span className="flex-1 truncate">{user.email}</span>
            <RolePill role={user.role} />
            {user.role !== 'admin' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRoleToggle(user)}
                >
                  {user.role === 'ward_admin' ? 'Demote' : 'Make Ward Admin'}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleRemove(user)}>
                  Remove
                </Button>
              </>
            )}
          </div>
        ))}
      </div>

      {unassigned.length > 0 && (
        <div className="flex items-center gap-2 pt-1">
          <select
            className="flex-1 rounded border bg-background px-3 py-1.5 text-sm"
            value={addUserId}
            onChange={(e) => setAddUserId(e.target.value)}
          >
            <option value="">Add a user to this ward…</option>
            {unassigned.map((u) => (
              <option key={u.id} value={String(u.id)}>
                {u.email} ({ROLE_LABELS[u.role] ?? u.role})
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

export default WardUsers
