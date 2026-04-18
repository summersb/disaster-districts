import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
type Changed = {
  old: {
    id: number
    familyName: string
    name: string
    address1?: string
    address2?: string
    city?: string
    state?: string
    phone?: string
  }
  updated: {
    id?: number
    familyName: string
    name: string
    address1?: string
    address2?: string
    city?: string
    state?: string
    phone?: string
  }
}

interface Props {
  children: React.ReactNode
}

const Old: React.FC<Props> = ({ children }) => {
  return (
    <span className="bg-red-900 text-white line-through px-1 rounded">
      {children}
    </span>
  )
}

const New: React.FC<Props> = ({ children }) => {
  return (
    <span className="bg-green-900 text-white px-1 rounded">{children}</span>
  )
}

interface Props2 {
  old: React.ReactNode
  updated: React.ReactNode
}

const ShowChange: React.FC<Props2> = ({ old, updated }) => {
  if (old === updated) {
    return updated
  }
  return (
    <>
      <Old>{old}</Old>
      <New>{updated}</New>
    </>
  )
}

type MembersProps = {
  members: Changed[]
}

const MembersUpdate = ({ members }: MembersProps): React.ReactElement => {
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
            <TableHead>Phone</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((m) => {
            return (
              <TableRow
                key={`update-${m.old.id}`}
                className="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b dark:border-gray-700"
              >
                <TableCell>
                  <ShowChange
                    old={m.old.familyName}
                    updated={m.updated.familyName}
                  />
                </TableCell>
                <TableCell>
                  <ShowChange old={m.old.name} updated={m.updated.name} />
                </TableCell>
                <TableCell>
                  <ShowChange
                    old={`${m.old.address1 ?? ''} ${m.old.address2 ?? ''}`}
                    updated={`${m.updated.address1 ?? ''} ${m.updated.address2 ?? ''}`}
                  />
                </TableCell>
                <TableCell>
                  <ShowChange old={m.old.city} updated={m.updated.city} />
                </TableCell>
                <TableCell>
                  <ShowChange old={m.old.state} updated={m.updated.state} />
                </TableCell>
                <TableCell>
                  <ShowChange old={m.old.phone} updated={m.updated.phone} />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </>
  )
}

export default MembersUpdate
