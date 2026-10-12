import type { ColumnDef } from '@tanstack/react-table'
import { ChevronsUpDown } from 'lucide-react'
import type React from 'react'
import { useMemo, useState } from 'react'
import MemberPicker from '@/components/members/MemberPicker'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { DataTable } from '@/components/ui/data-table'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useMembers } from '@/hooks/useMembers'
import { useUpdateUser, useUsers, useWardUsers } from '@/hooks/useUsers'
import { ALL_ROLES, isAdmin as checkIsAdmin, ROLE_LABELS } from '@/lib/roles'
import type { MemberDto, UserDto } from '@/type'

const memberName = (member: MemberDto) => `${member.familyName}, ${member.name}`

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
  // The member record chosen for the user being edited (0 = none).
  const [editMemberId, setEditMemberId] = useState(0)
  const [pickingMember, setPickingMember] = useState(false)
  const { data: members = [] } = useMembers(wardId)
  const sortedMembers = useMemo(
    () =>
      [...members].sort((a, b) => memberName(a).localeCompare(memberName(b))),
    [members],
  )
  const memberById = (id?: number | null) =>
    id ? members.find((m) => m.id === id) : undefined

  const [addError, setAddError] = useState('')
  // The member record to link the user being added to (0 = none).
  const [addMemberId, setAddMemberId] = useState(0)

  // Who can be added: any account not already in this ward, except system
  // admins (who can enter every ward anyway). Adding someone here doesn't
  // affect any other ward they belong to.
  const unassigned = allUsers.filter(
    (u) =>
      !checkIsAdmin(u.roles) && !u.wards?.some((ward) => ward.id === wardId),
  )

  const startEdit = (user: UserDto) => {
    setEditingId(user.id)
    setEditRoles([...user.roles])
    setEditMemberId(user.memberId ?? 0)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditRoles([])
    setPickingMember(false)
  }

  const saveEdit = (user: UserDto) => {
    const unmanaged = user.roles.filter((r) => !grantableRoles.includes(r))
    const managed = editRoles.filter((r) => grantableRoles.includes(r))
    const merged = [...new Set([...unmanaged, ...managed])]
    updateUser.mutate({
      id: user.id,
      wardId,
      roles: merged.length ? merged : ['user'],
      // Only sent when it changed; 0 removes the link.
      memberId:
        editMemberId !== (user.memberId ?? 0) ? editMemberId : undefined,
    })
    cancelEdit()
  }

  const handleAdd = async () => {
    if (!addUserId) return
    setAddError('')
    try {
      const res = await updateUser.mutateAsync({
        id: Number(addUserId),
        wardId,
        // Linked in the same step when a member was chosen.
        memberId: addMemberId || undefined,
      })
      if (!res.ok) {
        throw new Error(
          res.status === 403
            ? "You aren't allowed to add that user to this ward."
            : `Could not add the user (${res.status}).`,
        )
      }
      setAddUserId('')
      setAddMemberId(0)
    } catch (err) {
      setAddError(
        err instanceof Error ? err.message : 'Could not add the user.',
      )
    }
  }

  const handleRemove = (user: UserDto) => {
    updateUser.mutate({ id: user.id, wardId, removeFromWard: true })
  }

  const toggleEditRole = (role: string) => {
    setEditRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    )
  }

  const columns: ColumnDef<UserDto>[] = [
    { accessorKey: 'id', header: 'User ID' },
    {
      id: 'name',
      header: 'Name',
      accessorFn: (user) => user.name ?? '',
    },
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
      // Linking a login to the person's member record is what lets being a
      // district's leader or assistant count for that user.
      id: 'member',
      header: 'Member Record',
      accessorFn: (user) => {
        const member = memberById(user.memberId)
        return member ? memberName(member) : ''
      },
      cell: ({ row }) => {
        const user = row.original
        if (editingId !== user.id) {
          const member = memberById(user.memberId)
          return member ? (
            memberName(member)
          ) : (
            <span className="text-muted-foreground">Not linked</span>
          )
        }
        const chosen = memberById(editMemberId)
        return (
          <div className="flex items-center gap-1">
            <Popover open={pickingMember} onOpenChange={setPickingMember}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Choose member record"
                >
                  {chosen ? memberName(chosen) : 'Choose member'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" side="bottom" align="start">
                <Command>
                  <CommandInput placeholder="Search members" />
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandList>
                    <CommandGroup>
                      {sortedMembers.map((member) => (
                        <CommandItem
                          key={member.id}
                          value={String(member.id)}
                          keywords={[member.familyName, member.name]}
                          onSelect={() => {
                            setEditMemberId(member.id)
                            setPickingMember(false)
                          }}
                        >
                          {memberName(member)}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {chosen && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditMemberId(0)}
              >
                Clear
              </Button>
            )}
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
      enableSorting: false,
      cell: ({ row }) => {
        const user = row.original
        if (editingId === user.id) {
          return (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={cancelEdit}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => saveEdit(user)}>
                Save
              </Button>
            </div>
          )
        }
        if (checkIsAdmin(user.roles)) return null
        return (
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => startEdit(user)}>
              Edit
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
                  {u.name ? `${u.name} (${u.email})` : u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <MemberPicker
            wardId={wardId}
            value={addMemberId}
            onChange={setAddMemberId}
            placeholder="Link to member (optional)"
            label="Link the new user to a member"
            disabled={!addUserId}
          />
          <Button size="sm" onClick={handleAdd} disabled={!addUserId}>
            Add
          </Button>
        </div>
      )}

      {canAddUsers && unassigned.length === 0 && (
        <p className="text-sm text-muted-foreground">
          There are no accounts waiting to be added. Someone who hasn't signed
          up yet needs to create an account first; it will then appear here.
        </p>
      )}
      {addError && <p className="text-sm text-destructive">{addError}</p>}

      {wardUsers.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">
          No users assigned yet.
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={wardUsers}
          searchPlaceholder="Search users..."
          defaultSort={[{ id: 'name', desc: false }]}
        />
      )}
    </div>
  )
}

export default WardUsersPanel
