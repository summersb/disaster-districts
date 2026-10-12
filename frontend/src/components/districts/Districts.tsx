import { Link, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { Edit2, Plus, Split, Trash2 } from 'lucide-react'
import type React from 'react'
import { useMemo, useState } from 'react'
import MemberDisplayName from '@/components/MemberDisplayName.tsx'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx'
import useUser from '@/context/useUser.tsx'
import { useDeleteDistrict, useDistricts } from '@/hooks/useDistricts'
import { useMembers } from '@/hooks/useMembers'
import { getWardId } from '@/lib/api'
import { canManageUsers, isWardAdmin } from '@/lib/roles'
import { Route as DistrictRoute } from '@/routes/_protected/district/$id.tsx'
import { Route as DistrictAddRoute } from '@/routes/_protected/district/add'
import { Route as DistrictSplitRoute } from '@/routes/_protected/district/split.$id'
import type { DistrictDto, MemberDto } from '@/type'

// A district plus what the table shows about it, looked up from the ward's
// members (the districts API returns only leader/assistant ids).
type DistrictRow = {
  district: DistrictDto
  memberCount: number
  leader?: MemberDto
  assistant?: MemberDto
}

const memberName = (member?: MemberDto) =>
  member ? `${member.familyName}, ${member.name}` : ''

const Districts = (): React.ReactElement => {
  const navigate = useNavigate()
  const wardId = getWardId()
  const { data: districts = [] } = useDistricts(wardId)
  // One members request for the whole page; each row's count and
  // leader/assistant names are looked up from it.
  const { data: members = [] } = useMembers(wardId)
  const { user } = useUser()
  const canDelete = isWardAdmin(user.roles)
  // Splitting creates a district, which the server limits to ward managers.
  const canSplit = canManageUsers(user.roles)
  const deleteDistrict = useDeleteDistrict()
  const [deleting, setDeleting] = useState<DistrictDto | null>(null)

  const rows = useMemo<DistrictRow[]>(
    () =>
      districts.map((district) => ({
        district,
        memberCount: members.filter((m) => m.district?.id === district.id)
          .length,
        leader: members.find((m) => m.id === district.leaderId),
        assistant: members.find((m) => m.id === district.assistantId),
      })),
    [districts, members],
  )

  const handleDelete = async () => {
    if (!deleting) return
    await deleteDistrict.mutateAsync({ wardId, districtId: deleting.id })
    setDeleting(null)
  }

  const columns: ColumnDef<DistrictRow>[] = [
    {
      id: 'name',
      header: 'Name',
      accessorFn: (row) => row.district.name,
      // The name is the row's primary way in to the edit page; the pencil in
      // the Actions column does the same thing.
      cell: ({ row }) => {
        const d = row.original.district
        return (
          <Link
            to={DistrictRoute.to}
            params={{ id: String(d.id) }}
            className="flex items-center gap-2 font-medium underline-offset-4 hover:underline"
          >
            {/* Same pin the district's members get on the map. */}
            {d.color && (
              <img
                src={`/images/${d.color}.svg`}
                alt=""
                className="h-6 w-auto shrink-0"
              />
            )}
            {d.name}
          </Link>
        )
      },
    },
    {
      id: 'members',
      header: 'Members',
      accessorFn: (row) => row.memberCount,
    },
    {
      id: 'leader',
      header: 'Leader',
      accessorFn: (row) => memberName(row.leader),
      cell: ({ row }) => <MemberDisplayName member={row.original.leader} />,
    },
    {
      id: 'assistant',
      header: 'Assistant',
      accessorFn: (row) => memberName(row.assistant),
      cell: ({ row }) => <MemberDisplayName member={row.original.assistant} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      enableGlobalFilter: false,
      enableSorting: false,
      cell: ({ row }) => {
        const d = row.original.district
        return (
          <div className="flex justify-center gap-3">
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Edit ${d.name}`}
              title="Edit"
              onClick={() =>
                navigate({
                  to: DistrictRoute.to,
                  params: { id: String(d.id) },
                })
              }
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            {canSplit && (
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Split ${d.name}`}
                title="Split into two districts"
                onClick={() =>
                  navigate({
                    to: DistrictSplitRoute.to,
                    params: { id: String(d.id) },
                  })
                }
              >
                <Split className="w-4 h-4" />
              </Button>
            )}
            {canDelete && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Delete ${d.name}`}
                title="Delete"
                onClick={() => setDeleting(d)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Districts</h1>
        <Button onClick={() => navigate({ to: DistrictAddRoute.to })}>
          <Plus className="w-4 h-4 mr-2" />
          Add District
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="Search districts..."
        stateKey="districts"
        emptyMessage="No districts yet."
        defaultSort={[{ id: 'name', desc: false }]}
      />

      <Dialog
        open={deleting != null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete district?</DialogTitle>
            <DialogDescription>
              This will permanently delete &quot;{deleting?.name}&quot;. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleting(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteDistrict.isPending}
            >
              {deleteDistrict.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Districts
