import { Link } from '@tanstack/react-router'
import { Check, ChevronsUpDown, Download, Pencil, Upload } from 'lucide-react'
import type React from 'react'
import { useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import useUser from '@/context/useUser.tsx'
import { useDistricts } from '@/hooks/useDistricts'
import { useMembers } from '@/hooks/useMembers'
import { useWardUsers } from '@/hooks/useUsers'
import {
  exportWard,
  useImportWard,
  useSaveWard,
  useWard,
  WARD_EXPORT_FORMAT,
  type WardExportFile,
} from '@/hooks/useWards'
import { getWardId } from '@/lib/api'
import { downloadBlob } from '@/lib/districtPdf'
import { canManageUsers, hasRole } from '@/lib/roles'
import { cn } from '@/lib/utils'
import { Route as DistrictRoute } from '@/routes/_protected/district/$id.tsx'
import { Route as DistrictsRoute } from '@/routes/_protected/district/index'
import { Route as MemberEditRoute } from '@/routes/_protected/member/$id'
import { Route as MemberRoute } from '@/routes/_protected/member/index'
import type { MemberDto } from '@/type'
import type { UserDto } from '@/type/User'

const displayName = (member: MemberDto) =>
  `${member.familyName}, ${member.name}`

const byName = (a: MemberDto, b: MemberDto) =>
  displayName(a).localeCompare(displayName(b))

const memberAddress = (member: MemberDto) =>
  [
    member.address1,
    member.address2,
    member.city,
    [member.state, member.postalCode].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(', ') ||
  member.formattedAddress ||
  ''

const linkClass = 'font-medium underline-offset-4 hover:underline'

type StatProps = {
  label: string
  value: number
  children?: React.ReactNode
}

const Stat = ({ label, value, children }: StatProps) => (
  <Card className="gap-1 py-4">
    <CardContent>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-bold" data-testid={`stat-${label}`}>
        {value}
      </p>
      {children}
    </CardContent>
  </Card>
)

// A member's name with phone underneath, or a dash when there isn't one.
const MemberContact = ({ member }: { member?: MemberDto }) =>
  member ? (
    <>
      <Link
        to={MemberEditRoute.to}
        params={{ id: String(member.id) }}
        className={linkClass}
      >
        {displayName(member)}
      </Link>
      {member.phone && (
        <span className="block text-muted-foreground">{member.phone}</span>
      )}
    </>
  ) : (
    <span className="text-muted-foreground">Not assigned</span>
  )

const UserList = ({ users, empty }: { users: UserDto[]; empty: string }) =>
  users.length === 0 ? (
    <p className="text-sm text-muted-foreground">{empty}</p>
  ) : (
    <ul className="space-y-1 text-sm">
      {users.map((u) => (
        <li key={u.id}>
          {u.name ? (
            <>
              {u.name}{' '}
              <span className="text-muted-foreground">({u.email})</span>
            </>
          ) : (
            u.email
          )}
        </li>
      ))}
    </ul>
  )

// The ward's home page: its name and leader (editable by ward admins), who
// administers it, each district's leaders, and how many members are still
// waiting to be put in a district.
const WardDashboard = (): React.ReactElement => {
  const wardId = getWardId()
  const { user } = useUser()
  const canManage = canManageUsers(user.roles)
  const { data: ward } = useWard(wardId)
  const { data: districts = [] } = useDistricts(wardId)
  const { data: members = [] } = useMembers(wardId)
  // The server only lets ward admins list the ward's users.
  const { data: users = [] } = useWardUsers(canManage ? wardId : 0)
  const saveWard = useSaveWard()

  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState('')
  const [pickingLeader, setPickingLeader] = useState(false)
  const [error, setError] = useState('')
  const importWard = useImportWard()
  const fileInput = useRef<HTMLInputElement>(null)
  const [exporting, setExporting] = useState(false)
  // A parsed export file waiting for the user to confirm the import.
  const [pendingImport, setPendingImport] = useState<WardExportFile | null>(
    null,
  )
  const [transferStatus, setTransferStatus] = useState('')

  const sortedMembers = useMemo(() => [...members].sort(byName), [members])
  const wardLeader = members.find((m) => m.id === ward?.leaderId)
  const unassigned = useMemo(() => {
    const districtIds = new Set(districts.map((d) => d.id))
    return sortedMembers.filter(
      (m) => m.district?.id == null || !districtIds.has(m.district.id),
    )
  }, [districts, sortedMembers])
  const sortedDistricts = useMemo(
    () =>
      [...districts].sort((a, b) =>
        (a.name ?? '').localeCompare(b.name ?? '', undefined, {
          numeric: true,
        }),
      ),
    [districts],
  )
  const wardAdmins = users.filter((u) => hasRole(u.roles, 'ward_admin'))

  const save = async (
    changes: { name?: string; leaderId?: number },
    failure: string,
  ) => {
    setError('')
    try {
      const res = await saveWard.mutateAsync({ wardId, ward: changes })
      if (res.status === 409) {
        throw new Error('Another ward already has that name')
      }
      if (!res.ok) throw new Error(failure)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : failure)
      return false
    }
  }

  const handleExport = async () => {
    setExporting(true)
    setError('')
    setTransferStatus('')
    try {
      const blob = await exportWard(wardId)
      const date = new Date().toISOString().slice(0, 10)
      const name = (ward?.name ?? 'ward').trim().replace(/[^\w-]+/g, '-')
      downloadBlob(blob, `${name}-export-${date}.json`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  // Reads the chosen file and, if it looks like a ward export, asks for
  // confirmation before anything is sent.
  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0]
    // Reset so choosing the same file again still fires onChange.
    e.target.value = ''
    if (!chosen) return
    setError('')
    setTransferStatus('')
    try {
      const file = JSON.parse(await chosen.text()) as WardExportFile
      if (file?.format !== WARD_EXPORT_FORMAT) {
        throw new Error('not a ward export')
      }
      setPendingImport(file)
    } catch {
      setError(`"${chosen.name}" is not a ward export file.`)
    }
  }

  const confirmImport = async () => {
    if (!pendingImport) return
    try {
      const result = await importWard.mutateAsync({
        wardId,
        file: pendingImport,
      })
      setTransferStatus(
        `Imported: ${result.membersCreated} members added, ${result.membersUpdated} updated; ${result.districtsCreated} districts added, ${result.districtsUpdated} updated.`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setPendingImport(null)
    }
  }

  const startRename = () => {
    setNewName(ward?.name ?? '')
    setError('')
    setRenaming(true)
  }

  const submitRename = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    if (await save({ name }, 'Could not rename the ward')) setRenaming(false)
  }

  const chooseLeader = async (leaderId: number) => {
    setPickingLeader(false)
    await save({ leaderId }, 'Could not change the ward leader')
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        {renaming ? (
          <form onSubmit={submitRename} className="flex items-center gap-2">
            <Input
              aria-label="Ward name"
              className="max-w-sm"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
            <Button
              type="button"
              variant="ghost"
              disabled={saveWard.isPending}
              onClick={() => setRenaming(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                saveWard.isPending ||
                !newName.trim() ||
                newName.trim() === ward?.name
              }
            >
              {saveWard.isPending ? 'Saving...' : 'Save'}
            </Button>
          </form>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{ward?.name ?? 'Ward'}</h1>
            {canManage && (
              <Button
                size="sm"
                variant="ghost"
                aria-label="Rename ward"
                title="Rename ward"
                onClick={startRename}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
        {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
        {canManage && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={exporting}
              onClick={handleExport}
            >
              <Download className="mr-2 h-4 w-4" />
              {exporting ? 'Exporting...' : 'Export Ward (JSON)'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={importWard.isPending}
              onClick={() => fileInput.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import Ward (JSON)
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept=".json,application/json"
              className="hidden"
              aria-label="Ward export file"
              onChange={handleFileChosen}
            />
            {transferStatus && (
              <span className="text-sm" data-testid="ward-transfer-status">
                {transferStatus}
              </span>
            )}
          </div>
        )}
      </div>

      <Dialog
        open={pendingImport != null}
        onOpenChange={(open) => !open && setPendingImport(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import into {ward?.name ?? 'this ward'}?</DialogTitle>
            <DialogDescription>
              The file
              {pendingImport?.ward?.name
                ? ` (exported from "${pendingImport.ward.name}")`
                : ''}{' '}
              has {pendingImport?.members?.length ?? 0} members and{' '}
              {pendingImport?.districts?.length ?? 0} districts. Members and
              districts with the same name will be updated to match the file,
              including which district each member is in; the rest will be
              added. Nothing is deleted, and the ward keeps its name.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPendingImport(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirmImport}
              disabled={importWard.isPending}
            >
              {importWard.isPending ? 'Importing...' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Members" value={members.length}>
          <Link to={MemberRoute.to} className={cn(linkClass, 'text-sm')}>
            View members
          </Link>
        </Stat>
        <Stat label="Districts" value={districts.length}>
          <Link to={DistrictsRoute.to} className={cn(linkClass, 'text-sm')}>
            View districts
          </Link>
        </Stat>
        <Stat label="Not in a district" value={unassigned.length} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ward Leader</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <MemberContact member={wardLeader} />
            </p>
            {canManage && (
              <div className="flex flex-wrap gap-2">
                <Popover open={pickingLeader} onOpenChange={setPickingLeader}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={saveWard.isPending}
                    >
                      {wardLeader ? 'Change leader' : 'Choose leader'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0" side="bottom" align="start">
                    <Command>
                      <CommandInput placeholder="Search members" />
                      <CommandEmpty>No results found.</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {sortedMembers.map((member) => (
                            <CommandItem
                              key={member.id}
                              value={String(member.id)}
                              keywords={[
                                member.familyName,
                                member.name,
                                member.address1 ?? '',
                              ]}
                              onSelect={() => chooseLeader(member.id)}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  wardLeader?.id === member.id
                                    ? 'opacity-100'
                                    : 'opacity-0',
                                )}
                              />
                              {displayName(member)}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {wardLeader && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={saveWard.isPending}
                    onClick={() => chooseLeader(0)}
                  >
                    Clear
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {canManage && (
          <Card>
            <CardHeader>
              <CardTitle>Ward Admins ({wardAdmins.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <UserList users={wardAdmins} empty="No ward admins yet." />
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>District Leaders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>District</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Leader</TableHead>
                <TableHead>Assistant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedDistricts.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground"
                  >
                    No districts yet.
                  </TableCell>
                </TableRow>
              )}
              {sortedDistricts.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <Link
                      to={DistrictRoute.to}
                      params={{ id: String(d.id) }}
                      className={cn(linkClass, 'flex items-center gap-2')}
                    >
                      {d.color && (
                        <img
                          src={`/images/${d.color}.svg`}
                          alt=""
                          className="h-6 w-auto shrink-0"
                        />
                      )}
                      {d.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {members.filter((m) => m.district?.id === d.id).length}
                  </TableCell>
                  <TableCell>
                    <MemberContact
                      member={members.find((m) => m.id === d.leaderId)}
                    />
                  </TableCell>
                  <TableCell>
                    <MemberContact
                      member={members.find((m) => m.id === d.assistantId)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members Not in a District ({unassigned.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {unassigned.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Every member is assigned to a district.
            </p>
          ) : (
            <div
              className="max-h-96 overflow-y-auto"
              data-testid="unassigned-members"
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unassigned.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <Link
                          to={MemberEditRoute.to}
                          params={{ id: String(member.id) }}
                          className={linkClass}
                        >
                          {displayName(member)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {memberAddress(member) || (
                          <span className="text-muted-foreground">
                            No address on file
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{member.phone}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default WardDashboard
