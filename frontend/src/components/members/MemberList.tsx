import { useNavigate } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { Edit2, Plus } from 'lucide-react'
import type React from 'react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { useMembers } from '@/hooks/useMembers'
import { getWardId } from '@/lib/api'
import { Route as MemberEditRoute } from '@/routes/_protected/member/$id'
import { Route as MemberAddRoute } from '@/routes/_protected/member/add'
import type { MemberDto } from '@/type'

const MemberList = (): React.ReactElement => {
  const navigate = useNavigate()
  const wardId = getWardId()
  const { data: members = [] } = useMembers(wardId)

  const columns: ColumnDef<MemberDto>[] = [
    {
      id: 'name',
      header: 'Name',
      accessorFn: (member) => `${member.familyName}, ${member.name}`,
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
      cell: ({ row }) => (
        <div className="text-center">
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              navigate({
                to: MemberEditRoute.to,
                params: { id: String(row.original.id) },
              })
            }
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Members</h1>
        <Button onClick={() => navigate({ to: MemberAddRoute.to })}>
          <Plus className="w-4 h-4 mr-2" />
          Add Member
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={members}
        searchPlaceholder="Search members..."
      />
    </div>
  )
}

export default MemberList
