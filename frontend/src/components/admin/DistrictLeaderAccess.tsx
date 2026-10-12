import type React from 'react'
import { useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useDistricts } from '@/hooks/useDistricts'
import { useMembers } from '@/hooks/useMembers'
import { useWardUsers } from '@/hooks/useUsers'
import type { MemberDto, UserDto } from '@/type'

type Props = {
  wardId: number
}

type Row = {
  key: string
  district: string
  color?: string | null
  position: 'Leader' | 'Assistant'
  member?: MemberDto
  // Logins linked to that member - what gives the leader access.
  users: UserDto[]
}

// Shows, for every district leader and assistant, whether they can actually
// sign in and use their district: that takes a registered account in the ward
// whose "Member Record" (set in the users table below) is that person.
const DistrictLeaderAccess = ({ wardId }: Props): React.ReactElement => {
  const { data: districts = [] } = useDistricts(wardId)
  const { data: members = [] } = useMembers(wardId)
  const { data: users = [] } = useWardUsers(wardId)

  const rows = useMemo<Row[]>(() => {
    const sorted = [...districts].sort((a, b) =>
      (a.name ?? '').localeCompare(b.name ?? '', undefined, { numeric: true }),
    )
    return sorted.flatMap((d) =>
      (
        [
          ['Leader', d.leaderId],
          ['Assistant', d.assistantId],
        ] as const
      ).flatMap(([position, memberId]) =>
        memberId
          ? [
              {
                key: `${d.id}-${position}`,
                district: d.name ?? '',
                color: d.color,
                position,
                member: members.find((m) => m.id === memberId),
                users: users.filter((u) => u.memberId === memberId),
              },
            ]
          : [],
      ),
    )
  }, [districts, members, users])

  const withAccess = rows.filter((row) => row.users.length > 0).length

  return (
    <section className="space-y-2" data-testid="district-leader-access">
      <h2 className="text-lg font-semibold">
        District Leader Access ({withAccess} of {rows.length})
      </h2>
      <p className="text-sm text-muted-foreground">
        A leader or assistant has access once they have registered, been added
        to the ward, and had their account linked to their member record (Edit
        in the users table below).
      </p>
      {rows.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">
          No district has a leader or assistant yet.
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>District</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Access</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell>
                    <span className="flex items-center gap-2 font-medium">
                      {row.color && (
                        <img
                          src={`/images/${row.color}.svg`}
                          alt=""
                          className="h-6 w-auto shrink-0"
                        />
                      )}
                      {row.district}
                    </span>
                  </TableCell>
                  <TableCell>{row.position}</TableCell>
                  <TableCell>
                    {row.member
                      ? `${row.member.familyName}, ${row.member.name}`
                      : ''}
                  </TableCell>
                  <TableCell>
                    {row.users.length > 0 ? (
                      <span className="text-green-700 dark:text-green-500">
                        Has access ·{' '}
                        {row.users.map((u) => u.name ?? u.email).join(', ')}
                      </span>
                    ) : (
                      <span className="text-yellow-800 dark:text-yellow-500">
                        No account linked
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}

export default DistrictLeaderAccess
