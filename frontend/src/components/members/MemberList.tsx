import { Link, useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { Edit2, MapPinned, Plus, Trash2 } from 'lucide-react'
import type React from 'react'
import { useState } from 'react'
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
import { useDeleteMember, useMembers } from '@/hooks/useMembers'
import { getWardId } from '@/lib/api'
import { isWardAdmin } from '@/lib/roles'
import { Route as MemberEditRoute } from '@/routes/_protected/member/$id'
import { Route as MemberAddRoute } from '@/routes/_protected/member/add'
import { Route as MemberLocationsRoute } from '@/routes/_protected/member/locations'
import type { MemberDto } from '@/type'

const MemberList = (): React.ReactElement => {
  const navigate = useNavigate()
  const wardId = getWardId()
  const { data: members = [] } = useMembers(wardId)
  const { user } = useUser()
  const canDelete = isWardAdmin(user.roles)
  const deleteMember = useDeleteMember()
  const [deletingMember, setDeletingMember] = useState<MemberDto | null>(null)

  const handleDelete = async () => {
    if (!deletingMember?.id) return
    await deleteMember.mutateAsync({ wardId, memberId: deletingMember.id })
    setDeletingMember(null)
  }

  const displayName = (member: MemberDto) =>
    `${member.familyName}, ${member.name}`

  const columns: ColumnDef<MemberDto>[] = [
    {
      id: 'name',
      header: 'Name',
      accessorFn: displayName,
      // The name is the row's primary way in to the edit page; the pencil in
      // the Actions column does the same thing.
      cell: ({ row }) => (
        <Link
          to={MemberEditRoute.to}
          params={{ id: String(row.original.id) }}
          className="font-medium underline-offset-4 hover:underline"
        >
          {displayName(row.original)}
        </Link>
      ),
    },
    { accessorKey: 'address1', header: 'Address' },
    { accessorKey: 'city', header: 'City' },
    {
      id: 'district',
      header: 'District',
      accessorFn: (member) => member.district?.name ?? '',
    },
    {
      id: 'actions',
      header: 'Actions',
      enableGlobalFilter: false,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Edit ${displayName(row.original)}`}
            title="Edit"
            onClick={() =>
              navigate({
                to: MemberEditRoute.to,
                params: { id: String(row.original.id) },
              })
            }
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          {canDelete && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Delete ${displayName(row.original)}`}
              title="Delete"
              onClick={() => setDeletingMember(row.original)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Members</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate({ to: MemberLocationsRoute.to })}
          >
            <MapPinned className="w-4 h-4 mr-2" />
            Check Locations
          </Button>
          <Button onClick={() => navigate({ to: MemberAddRoute.to })}>
            <Plus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={members}
        searchPlaceholder="Search members..."
        defaultSort={[{ id: 'name', desc: false }]}
      />

      <Dialog
        open={deletingMember != null}
        onOpenChange={(open) => !open && setDeletingMember(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete member?</DialogTitle>
            <DialogDescription>
              This will permanently delete &quot;{deletingMember?.familyName},{' '}
              {deletingMember?.name}&quot;. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeletingMember(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMember.isPending}
            >
              {deleteMember.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MemberList
