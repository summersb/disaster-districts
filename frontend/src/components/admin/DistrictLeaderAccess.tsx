import type React from 'react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { useUpdateUser, useUsers, useWardUsers } from '@/hooks/useUsers'
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
  // Every account, not only those already in the ward: linking one also adds
  // it to the ward.
  const { data: accounts = [] } = useUsers()
  const updateUser = useUpdateUser()
  // The account picked in each row's "Link account" list, keyed by row.
  const [picked, setPicked] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  // Links (or with memberId 0, unlinks) an account and this ward's member.
  const setLink = async (userId: number, memberId: number, rowKey?: string) => {
    setError('')
    try {
      const res = await updateUser.mutateAsync({ id: userId, wardId, memberId })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? `Could not update (${res.status})`)
      }
      if (rowKey) setPicked((prev) => ({ ...prev, [rowKey]: '' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update')
    }
  }

  // Accounts that could be linked: any not already linked to someone in this
  // ward. That includes system admins - one can be a district's leader or
  // assistant like anyone else.
  const linkable = accounts
    .filter((account) => !users.some((u) => u.id === account.id && u.memberId))
    .sort((a, b) => a.email.localeCompare(b.email))

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
        to the ward, and had their account linked to their member record. Link
        an account here, when granting access above, or with Edit in the users
        table below.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
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
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-green-700 dark:text-green-500">
                          Has access ·{' '}
                          {row.users.map((u) => u.name ?? u.email).join(', ')}
                        </span>
                        {row.users.map((u) => (
                          <Button
                            key={u.id}
                            size="xs"
                            variant="ghost"
                            disabled={updateUser.isPending}
                            aria-label={`Unlink ${u.email} from ${row.district} ${row.position}`}
                            onClick={() => setLink(u.id, 0)}
                          >
                            Unlink
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-yellow-800 dark:text-yellow-500">
                          No account linked
                        </span>
                        {row.member && (
                          <>
                            <Select
                              value={picked[row.key] ?? ''}
                              onValueChange={(value) =>
                                setPicked((prev) => ({
                                  ...prev,
                                  [row.key]: value,
                                }))
                              }
                            >
                              <SelectTrigger
                                size="sm"
                                className="w-56"
                                aria-label={`Account for ${row.district} ${row.position}`}
                              >
                                <SelectValue placeholder="Link an account…" />
                              </SelectTrigger>
                              <SelectContent>
                                {linkable.length === 0 && (
                                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                    No accounts available - they need to sign up
                                    first.
                                  </div>
                                )}
                                {linkable.map((account) => (
                                  <SelectItem
                                    key={account.id}
                                    value={String(account.id)}
                                  >
                                    {account.name
                                      ? `${account.name} (${account.email})`
                                      : account.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              disabled={
                                !picked[row.key] || updateUser.isPending
                              }
                              onClick={() =>
                                row.member &&
                                setLink(
                                  Number(picked[row.key]),
                                  row.member.id,
                                  row.key,
                                )
                              }
                            >
                              Link
                            </Button>
                          </>
                        )}
                      </div>
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
