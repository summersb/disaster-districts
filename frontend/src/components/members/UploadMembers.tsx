import type React from 'react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAddMember, useMembers } from '@/hooks/useMembers'
import { getWardId } from '@/lib/api'
import type { MemberDto } from '@/type'
import UploadCsv from './UploadCsv'
import UploadPdf from './UploadPdf'

type ImportResult = 'created' | 'skipped' | 'failed'

type ImportRow = {
  member: MemberDto
  existing: boolean
  selected: boolean
  result?: ImportResult
  error?: string
}

// The backend derives no formatted address of its own and rejects members
// without one (formatted_address is NOT NULL) - build it the same way
// AddMember.tsx does.
const buildFormattedAddress = (member: MemberDto) =>
  [
    member.address1,
    member.city,
    [member.state, member.postalCode].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(', ')

// Mirrors MembersResource.createMember's own conflict check (family name +
// given name, within the same ward), so a row's predicted New/Already-exists
// status matches what the server will actually do with it.
const nameKey = (member: {
  familyName?: string | null
  name?: string | null
}) =>
  `${(member.familyName ?? '').trim().toLowerCase()}|${(member.name ?? '').trim().toLowerCase()}`

const UploadMembers = (): React.ReactElement => {
  const wardId = getWardId()
  const { data: existingMembers = [] } = useMembers(wardId)
  const addMember = useAddMember()

  const [rows, setRows] = useState<ImportRow[]>([])
  const [importing, setImporting] = useState(false)

  const existingNames = useMemo(
    () => new Set(existingMembers.map(nameKey)),
    [existingMembers],
  )

  const handleParsedMembers = (members: MemberDto[]) => {
    setRows(
      members
        .filter((member) => member.familyName?.trim() || member.name?.trim())
        .map((member) => {
          const existing = existingNames.has(nameKey(member))
          return { member, existing, selected: !existing }
        }),
    )
  }

  const handleReset = () => setRows([])

  const toggleRow = (index: number) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, selected: !row.selected } : row,
      ),
    )
  }

  const handleImport = async () => {
    setImporting(true)
    const next = [...rows]
    for (let i = 0; i < next.length; i++) {
      const row = next[i]
      if (!row.selected || row.result) {
        continue
      }
      try {
        const res = await addMember.mutateAsync({
          wardId,
          member: {
            ...row.member,
            formattedAddress: buildFormattedAddress(row.member),
          },
        })
        if (res.status === 409) {
          next[i] = { ...row, result: 'skipped', error: 'Already exists' }
        } else if (!res.ok) {
          next[i] = { ...row, result: 'failed', error: `HTTP ${res.status}` }
        } else {
          next[i] = { ...row, result: 'created' }
        }
      } catch (err) {
        next[i] = {
          ...row,
          result: 'failed',
          error: err instanceof Error ? err.message : 'Unknown error',
        }
      }
      setRows([...next])
    }
    setImporting(false)
  }

  const summary = useMemo(
    () => ({
      created: rows.filter((r) => r.result === 'created').length,
      skipped: rows.filter((r) => r.result === 'skipped').length,
      failed: rows.filter((r) => r.result === 'failed').length,
    }),
    [rows],
  )

  const hasResults = rows.some((r) => r.result)
  const canImport = rows.some((r) => r.selected && !r.result)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Upload Members</h1>

      {rows.length === 0 && (
        <Tabs defaultValue="csv" className="w-full">
          <TabsList>
            <TabsTrigger value="csv">Upload CSV</TabsTrigger>
            <TabsTrigger value="pdf">Upload PDF</TabsTrigger>
          </TabsList>
          <TabsContent value="csv">
            <UploadCsv setMembers={handleParsedMembers} />
          </TabsContent>
          <TabsContent value="pdf">
            <UploadPdf setMembers={handleParsedMembers} />
          </TabsContent>
        </Tabs>
      )}

      {rows.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Review {rows.length} member{rows.length === 1 ? '' : 's'}
            </h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={importing}
              >
                Upload a Different File
              </Button>
              <Button onClick={handleImport} disabled={importing || !canImport}>
                {importing ? 'Importing...' : 'Import Selected'}
              </Button>
            </div>
          </div>

          {hasResults && (
            <p
              className="text-sm text-muted-foreground"
              data-testid="import-summary"
            >
              {summary.created} created, {summary.skipped} skipped (already
              exist), {summary.failed} failed
            </p>
          )}

          <div className="max-h-[500px] overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={row.member.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={row.selected}
                        disabled={importing || !!row.result}
                        onChange={() => toggleRow(i)}
                      />
                    </TableCell>
                    <TableCell>
                      {row.member.familyName}, {row.member.name}
                    </TableCell>
                    <TableCell>{row.member.address1}</TableCell>
                    <TableCell>{row.member.city}</TableCell>
                    <TableCell>
                      {row.result === 'created' && (
                        <span className="text-green-500">Created</span>
                      )}
                      {row.result === 'skipped' && (
                        <span className="text-yellow-500">
                          Skipped ({row.error})
                        </span>
                      )}
                      {row.result === 'failed' && (
                        <span className="text-red-500">
                          Failed ({row.error})
                        </span>
                      )}
                      {!row.result && row.existing && (
                        <span className="text-yellow-500">Already exists</span>
                      )}
                      {!row.result && !row.existing && (
                        <span className="text-blue-400">New</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}

export default UploadMembers
