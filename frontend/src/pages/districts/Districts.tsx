import MemberDisplayName from '@/components/MemberDisplayName.tsx'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useDistricts } from '@/hooks/useDistricts'
import { useMembers } from '@/hooks/useMembers'
import { getWardId } from '@/lib/api'
import { Route as DistrictRoute } from '@/routes/_protected/district/$id'
import { Route as DistrictViewRoute } from '@/routes/_protected/district/view.$id'
import type { District, Member } from '@/type'
import { Link } from '@tanstack/react-router'
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { FilePenLine, View } from 'lucide-react'
import DeleteDistrictButton from './DeleteDistrictButton'

const columns: (memberList: Member[]) => ColumnDef<District>[] = (
  memberList: Member[],
) => [
  {
    accessorKey: 'view',
    header: 'View',
    cell: (info) => (
      <Link
        to={DistrictViewRoute.to}
        params={{ id: String(info.row.original.id) }}
      >
        <Button size="icon">
          <View />
        </Button>
      </Link>
    ),
  },
  {
    accessorKey: 'edit',
    header: 'Edit',
    cell: (info) => (
      <Link to={DistrictRoute.to} params={{ id: String(info.row.original.id) }}>
        <Button size="icon">
          <FilePenLine />
        </Button>{' '}
      </Link>
    ),
  },
  {
    accessorKey: 'name',
    header: 'District Name',
  },
  {
    accessorKey: 'leader',
    header: 'Leader',
    cell: (info) => {
      const leader = info.row.original.leader
      return <MemberDisplayName member={leader} />
    },
  },
  {
    accessorKey: 'assistant',
    header: 'Assistant',
    cell: (info) => {
      const assistant = info.row.original.assistant
      return <MemberDisplayName member={assistant} />
    },
  },
  {
    accessorKey: 'count',
    header: 'Member Count',
    cell: (info) => {
      const districtId = info.row.original.id
      const count = memberList.filter((m) => m.district?.id === districtId).length
      return <span>{count}</span>
    },
  },
  {
    accessorKey: 'delete',
    header: 'Delete',
    cell: (info) => <DeleteDistrictButton district={info.row.original} />,
  },
]

export default function Districts() {
  const wardId = getWardId()
  const { data: districts } = useDistricts(wardId)

  const { data: memberList } = useMembers(wardId)

  const table = useReactTable({
    data: districts || [],
    columns: columns(memberList || []),
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Table>
      <TableCaption>List of districts</TableCaption>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {flexRender(
                  header.column.columnDef.header,
                  header.getContext(),
                )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
