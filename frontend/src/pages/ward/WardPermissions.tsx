import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx'
import type { UserRoles } from '@/type/User.ts'
import { useQuery } from '@tanstack/react-query'
import type React from 'react'

const WardPermissions = (): React.ReactElement => {
  const { data: permissions } = useQuery<UserRoles>({
    queryKey: ['wardPermissions'],
    queryFn: async () => {
      const res = await fetch('/api/wards/permissions')
      return res.json()
    },
  })
  return (
    <Table>
      <TableCaption>List of members</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Id</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Role</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {permissions &&
          Object.entries((permissions as any).users || {}).map(
            ([id, { role, email, name }]: any) => (
              <TableRow
                key={id}
                className="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b dark:border-gray-700"
              >
                <TableCell>{id}</TableCell>
                <TableCell>{email}</TableCell>
                <TableCell>{name}</TableCell>
                <TableCell>{role}</TableCell>
              </TableRow>
            ),
          )}
      </TableBody>
    </Table>
  )
}

export default WardPermissions
