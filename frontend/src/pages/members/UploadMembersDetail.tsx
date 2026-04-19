import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Member } from '@/type'

type MembersProps = {
  members: Member[]
}

const UploadMembersDetail = ({ members }: MembersProps): React.ReactElement => {
  return (
    <>
      <Table>
        <TableCaption>List of members</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Surname</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>City</TableHead>
            <TableHead>State</TableHead>
            <TableHead>Lat</TableHead>
            <TableHead>Long</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(members ?? [])
            .slice()
            .sort((a, b) => a.familyName.localeCompare(b.familyName))
            .map((m) => {
              return (
                <TableRow
                  key={m.id}
                  className="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b dark:border-gray-700"
                >
                  <TableCell>{m.familyName}</TableCell>
                  <TableCell>{m.name}</TableCell>
                  <TableCell>
                    {m.address1} {m.address2}
                  </TableCell>
                  <TableCell>{m.city}</TableCell>
                  <TableCell>{m.state}</TableCell>
                  <TableCell>{m.lat}</TableCell>
                  <TableCell>{m.lng}</TableCell>
                </TableRow>
              )
            })}
        </TableBody>
      </Table>
    </>
  )
}

export default UploadMembersDetail
