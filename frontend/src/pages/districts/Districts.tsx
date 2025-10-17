import { getDistrictList, getMemberList } from '@/api'
import { useQuery } from '@tanstack/react-query'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { DistrictDbType, Member } from '@/type'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { FilePenLine, View } from 'lucide-react'
import DeleteDistrictButton from './DeleteDistrictButton'
import MemberDisplayName from '@/components/MemberDisplayName.tsx'

const columns: (memberList: Member[]) => ColumnDef<DistrictDbType>[] = (
  memberList: Member[],
) => [
  {
    accessorKey: 'view',
    header: 'View',
    cell: (info) => (
      <Link to={`/printdistrict/${info.row.original.id}`}>
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
      <Link to={`/district/${info.row.original.id}`}>
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
      const leader = memberList?.find(
        (m: Member) => m.id == info.row.original.leaderId,
      )
      return <MemberDisplayName member={leader} />
    },
  },
  {
    accessorKey: 'assistant',
    header: 'Assistant',
    cell: (info) => {
      const assistant = memberList?.find(
        (m: Member) => m.id == info.row.original.assistantId,
      )
      return <MemberDisplayName member={assistant} />
    },
  },
  {
    accessorKey: 'count',
    header: 'Member Count',
    cell: (info) => {
      return <span>{info.row.original?.members?.length ?? -1}</span>
    },
  },
  {
    accessorKey: 'delete',
    header: 'Delete',
    cell: (info) => <DeleteDistrictButton district={info.row.original} />,
  },
]

export default function Districts() {
  const { data: districts } = useQuery({
    queryKey: ['districts'],
    queryFn: () =>
      getDistrictList().then((data) =>
        data.sort((s1, s2) => s1.name.localeCompare(s2.name)),
      ),
  })

  const { data: memberList } = useQuery({
    queryKey: ['members'],
    queryFn: () =>
      getMemberList().then((data) =>
        data.sort((s1, s2) => s1.familyName.localeCompare(s2.familyName)),
      ),
  })

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
