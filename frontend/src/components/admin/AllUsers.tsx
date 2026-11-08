import type { ColumnDef } from '@tanstack/react-table'
import type React from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import useUser from '@/context/useUser.tsx'
import { useUsers } from '@/hooks/useUsers'
import { describeAccess, hasWardAccess, isAdmin } from '@/lib/roles'
import type { UserDto } from '@/type'
import EditUserAccess from './EditUserAccess'

type WardAccess = { wardId: number; ward: string; access: string }

type UserRow = {
  id: number
  name: string
  email: string
  systemAdmin: boolean
  wards: WardAccess[]
  // Plain text of the wards and access, so the table search finds them.
  wardsText: string
}

// Each ward the account belongs to, with what it may do there. A system
// admin is listed by the server against every ward with the role "admin";
// that is shown once as "System Admin" instead, so only wards where they hold
// some other standing (ward admin, district leader, a linked member) appear.
const wardAccess = (user: UserDto): WardAccess[] => {
  const systemAdmin = isAdmin(user.roles)
  return (user.wards ?? []).flatMap((ward) => {
    const roles = ward.roles.filter((role) => role !== 'admin')
    if (systemAdmin && roles.length === 0 && ward.memberId == null) return []
    return [
      {
        wardId: ward.id,
        ward: ward.name,
        access: hasWardAccess(roles)
          ? describeAccess(roles)
          : 'Account only (no access)',
      },
    ]
  })
}

const baseColumns: ColumnDef<UserRow>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) =>
      row.original.name || (
        <span className="italic text-muted-foreground">No name</span>
      ),
  },
  { accessorKey: 'email', header: 'Email' },
  {
    accessorKey: 'systemAdmin',
    header: 'System Admin',
    enableGlobalFilter: false,
    sortingFn: (a, b) =>
      Number(a.original.systemAdmin) - Number(b.original.systemAdmin),
    cell: ({ row }) =>
      row.original.systemAdmin ? (
        <span className="font-medium">Yes (all wards)</span>
      ) : (
        <span className="text-muted-foreground">No</span>
      ),
  },
  {
    accessorKey: 'wardsText',
    header: 'Wards and permissions',
    enableSorting: false,
    cell: ({ row }) =>
      row.original.wards.length === 0 ? (
        <span className="italic text-muted-foreground">
          {row.original.systemAdmin ? 'No ward roles' : 'Not in any ward'}
        </span>
      ) : (
        <ul className="space-y-0.5">
          {row.original.wards.map((w) => (
            <li key={w.wardId}>
              <span className="font-medium">{w.ward}</span>
              <span className="text-muted-foreground"> — {w.access}</span>
            </li>
          ))}
        </ul>
      ),
  },
]

// Every registered account and what it may do: system admin or not, and its
// access in each ward it belongs to. "Edit" changes those permissions.
const AllUsers = (): React.ReactElement => {
  const { data: users = [], isLoading, isError } = useUsers()
  const { user: currentUser } = useUser()
  // Looked up from the query each render, so the dialog shows saved changes.
  const [editingId, setEditingId] = useState<number | null>(null)
  const editingUser = users.find((u) => u.id === editingId)

  const columns: ColumnDef<UserRow>[] = [
    ...baseColumns,
    {
      id: 'actions',
      header: 'Actions',
      enableGlobalFilter: false,
      enableSorting: false,
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          aria-label={`Edit permissions for ${row.original.email}`}
          onClick={() => setEditingId(row.original.id)}
        >
          Edit
        </Button>
      ),
    },
  ]

  const rows: UserRow[] = users.map((user) => {
    const wards = wardAccess(user)
    return {
      id: user.id,
      name: user.name ?? '',
      email: user.email,
      systemAdmin: isAdmin(user.roles),
      wards,
      wardsText: wards.map((w) => `${w.ward} ${w.access}`).join(' '),
    }
  })

  return (
    <section className="space-y-2" data-testid="all-users">
      <h2 className="text-xl font-semibold">
        All Users {!isLoading && `(${users.length})`}
      </h2>
      <p className="text-sm text-muted-foreground">
        Every registered account and its permissions in each ward. Use Edit to
        make someone a system admin, change their access in a ward, or add them
        to or remove them from wards. District leaders come from the member an
        account is linked to, on each ward's Ward Users page.
      </p>
      <Card className="p-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading users...</p>
        ) : isError ? (
          <p className="text-sm text-destructive">Could not load users.</p>
        ) : (
          <DataTable
            columns={columns}
            data={rows}
            searchPlaceholder="Search users..."
            emptyMessage="No registered users."
            defaultSort={[{ id: 'email', desc: false }]}
            stateKey="system-admin-users"
          />
        )}
      </Card>
      {editingUser && (
        <EditUserAccess
          user={editingUser}
          currentUserId={currentUser.id}
          onClose={() => setEditingId(null)}
        />
      )}
    </section>
  )
}

export default AllUsers
