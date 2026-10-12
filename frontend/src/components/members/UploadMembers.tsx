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
import { useImportMembers, useMembers } from '@/hooks/useMembers'
import { getWardId } from '@/lib/api'
import type { MemberDto } from '@/type'
import UploadCsv from './UploadCsv'
import UploadPdf from './UploadPdf'

type ImportResult = 'created' | 'skipped' | 'failed'

// How a row compares to the ward's current members:
//   new      - in the uploaded file, not yet in the ward
//   existing - in the uploaded file and already in the ward
//   delete   - in the ward but missing from the uploaded file (e.g. moved out)
type ImportCategory = 'new' | 'existing' | 'delete'

type CategoryFilter = 'all' | ImportCategory

const categoryFilters: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'existing', label: 'Existing' },
  { value: 'delete', label: 'Delete' },
]

type ImportRow = {
  member: MemberDto
  category: ImportCategory
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

// Mirrors MembersResource's own conflict check (family name +
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
  const importMembers = useImportMembers()

  const [rows, setRows] = useState<ImportRow[]>([])
  const [importing, setImporting] = useState(false)
  const [filter, setFilter] = useState<CategoryFilter>('all')

  const existingNames = useMemo(
    () => new Set(existingMembers.map(nameKey)),
    [existingMembers],
  )

  const handleParsedMembers = (members: MemberDto[]) => {
    const fileRows: ImportRow[] = members
      .filter((member) => member.familyName?.trim() || member.name?.trim())
      .map((member) => {
        const existing = existingNames.has(nameKey(member))
        return {
          member,
          category: existing ? 'existing' : 'new',
          selected: !existing,
        }
      })
    // Ward members the file doesn't mention - listed for review only; the
    // import never selects or submits them.
    const fileNames = new Set(fileRows.map((row) => nameKey(row.member)))
    const missingRows: ImportRow[] = existingMembers
      .filter((member) => !fileNames.has(nameKey(member)))
      .map((member) => ({ member, category: 'delete', selected: false }))
    setRows([...fileRows, ...missingRows])
    setFilter('all')
  }

  const handleReset = () => setRows([])

  const toggleRow = (index: number) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, selected: !row.selected } : row,
      ),
    )
  }

  // Sends every selected row in a single request, then maps the server's
  // per-member results back onto the rows they came from.
  const handleImport = async () => {
    const pending = rows
      .map((row, rowIndex) => ({ row, rowIndex }))
      .filter(({ row }) => row.selected && !row.result)
    if (pending.length === 0) return

    setImporting(true)
    const next = [...rows]
    try {
      const response = await importMembers.mutateAsync({
        wardId,
        members: pending.map(({ row }) => ({
          ...row.member,
          formattedAddress: buildFormattedAddress(row.member),
        })),
      })
      const byIndex = new Map(response.results.map((r) => [r.index, r]))
      pending.forEach(({ row, rowIndex }, i) => {
        const result = byIndex.get(i)
        next[rowIndex] = result
          ? {
              ...row,
              result: result.status,
              error: result.error ?? undefined,
            }
          : { ...row, result: 'failed', error: 'No result returned' }
      })
    } catch (err) {
      // The request itself failed, so nothing is known about any member.
      const error = err instanceof Error ? err.message : 'Unknown error'
      for (const { row, rowIndex } of pending) {
        next[rowIndex] = { ...row, result: 'failed', error }
      }
    }
    setRows(next)
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

  const categoryCounts = useMemo(
    () => ({
      all: rows.length,
      new: rows.filter((r) => r.category === 'new').length,
      existing: rows.filter((r) => r.category === 'existing').length,
      delete: rows.filter((r) => r.category === 'delete').length,
    }),
    [rows],
  )

  // Keep each row's position in `rows` so toggling still targets the right
  // one while a filter is hiding the others.
  const visibleRows = rows
    .map((row, rowIndex) => ({ row, rowIndex }))
    .filter(({ row }) => filter === 'all' || row.category === filter)
  const fileRowCount = rows.length - categoryCounts.delete

  // Select-all acts on the rows the current filter shows, skipping ones that
  // can't be selected (already imported, or only listed as missing).
  const selectableRows = visibleRows.filter(
    ({ row }) => !row.result && row.category !== 'delete',
  )
  const allSelected =
    selectableRows.length > 0 && selectableRows.every(({ row }) => row.selected)
  const someSelected = selectableRows.some(({ row }) => row.selected)

  const toggleAll = () => {
    const indexes = new Set(selectableRows.map(({ rowIndex }) => rowIndex))
    setRows((prev) =>
      prev.map((row, i) =>
        indexes.has(i) ? { ...row, selected: !allSelected } : row,
      ),
    )
  }

  const hasResults = rows.some((r) => r.result)
  const canImport = rows.some((r) => r.selected && !r.result)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Upload Members</h1>

      {rows.length === 0 && (
        <Tabs defaultValue="pdf" className="w-full">
          <TabsList>
            <TabsTrigger value="pdf">Upload PDF</TabsTrigger>
            <TabsTrigger value="csv">Upload CSV</TabsTrigger>
          </TabsList>
          <TabsContent value="pdf">
            <UploadPdf setMembers={handleParsedMembers} />
          </TabsContent>
          <TabsContent value="csv">
            <UploadCsv setMembers={handleParsedMembers} />
          </TabsContent>
        </Tabs>
      )}

      {rows.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Review {fileRowCount} member{fileRowCount === 1 ? '' : 's'}
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

          <div className="flex flex-wrap gap-2" data-testid="import-filter">
            {categoryFilters.map(({ value, label }) => (
              <Button
                key={value}
                size="sm"
                variant={filter === value ? 'default' : 'outline'}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label} ({categoryCounts[value]})
              </Button>
            ))}
          </div>

          <div className="max-h-[500px] overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected && !allSelected
                      }}
                      disabled={importing || selectableRows.length === 0}
                      onChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground"
                    >
                      No members in this category
                    </TableCell>
                  </TableRow>
                )}
                {visibleRows.map(({ row, rowIndex }) => (
                  <TableRow key={row.member.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={row.selected}
                        disabled={
                          importing || !!row.result || row.category === 'delete'
                        }
                        onChange={() => toggleRow(rowIndex)}
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
                      {!row.result && row.category === 'existing' && (
                        <span className="text-yellow-500">Already exists</span>
                      )}
                      {!row.result && row.category === 'new' && (
                        <span className="text-blue-400">New</span>
                      )}
                      {!row.result && row.category === 'delete' && (
                        <span className="text-red-400">Not in file</span>
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
