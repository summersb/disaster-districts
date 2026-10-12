import { FileDown } from 'lucide-react'
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
import useUser from '@/context/useUser.tsx'
import { useDistricts } from '@/hooks/useDistricts'
import { useMembers } from '@/hooks/useMembers'
import { useWard } from '@/hooks/useWards'
import { getWardId } from '@/lib/api'
import {
  buildDistrictReports,
  type DistrictReport,
  downloadBlob,
  generateDistrictsPdf,
  type WardPacketExtras,
} from '@/lib/districtPdf'
import { isAdmin, isDistrictAdmin, isWardAdmin } from '@/lib/roles'

// Safe to use as a file name on any OS.
const fileNamePart = (text: string) =>
  text
    .trim()
    .replace(/[^\w-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'district'

// Lists the ward's districts with a PDF download for each (a roster of the
// district's leader, assistant and members, then a full-page map), plus one
// PDF of every district for ward admins.
const PrintDistricts = (): React.ReactElement => {
  const wardId = getWardId()
  const { user } = useUser()
  const { data: ward } = useWard(wardId)
  const { data: districts = [] } = useDistricts(wardId)
  const { data: members = [] } = useMembers(wardId)

  // District admins print one district at a time; the whole-ward packet is
  // for ward admins (and system admins).
  const canPrintAll = isAdmin(user.roles) || isWardAdmin(user.roles)
  const canPrintOne = canPrintAll || isDistrictAdmin(user.roles)

  // Which download is running ('all' or a district id) and how far along.
  const [busy, setBusy] = useState<number | 'all' | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number }>()
  const [error, setError] = useState('')

  const reports = useMemo(
    () =>
      buildDistrictReports(districts, members).sort((a, b) =>
        (a.district.name ?? '').localeCompare(
          b.district.name ?? '',
          undefined,
          {
            numeric: true,
          },
        ),
      ),
    [districts, members],
  )

  // Listed on the closing page of the whole-ward packet.
  const unassigned = useMemo(() => {
    const districtIds = new Set(districts.map((d) => d.id))
    return members
      .filter((m) => m.district?.id == null || !districtIds.has(m.district.id))
      .sort((a, b) =>
        `${a.familyName}, ${a.name}`.localeCompare(
          `${b.familyName}, ${b.name}`,
        ),
      )
  }, [districts, members])

  const download = async (
    key: number | 'all',
    selected: DistrictReport[],
    filename: string,
    extras?: WardPacketExtras,
  ) => {
    setBusy(key)
    setProgress(undefined)
    setError('')
    try {
      const blob = await generateDistrictsPdf(
        selected,
        ward?.name ?? '',
        (done, total) => setProgress({ done, total }),
        extras,
      )
      downloadBlob(blob, filename)
    } catch (err) {
      console.error(err)
      setError('Could not create the PDF - try again.')
    } finally {
      setBusy(null)
    }
  }

  const wardPart = fileNamePart(ward?.name ?? 'ward')

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Print Districts</h1>
        {canPrintAll && (
          <Button
            disabled={busy != null || reports.length === 0}
            onClick={() =>
              download('all', reports, `${wardPart}-districts.pdf`, {
                unassigned,
              })
            }
          >
            <FileDown className="w-4 h-4 mr-2" />
            {busy === 'all'
              ? progress
                ? `Creating ${Math.min(progress.done + 1, progress.total)} of ${progress.total}...`
                : 'Creating...'
              : 'Download All Districts (PDF)'}
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Each PDF lists the district's leader, assistant and members with their
        address, phone and comments, followed by a full-page map of just that
        district's members. Map numbers match the member list. The all-districts
        PDF also opens with a page of district leaders and their contact
        details, and ends with the members not assigned to any district.
      </p>
      {!canPrintOne && (
        <p className="text-sm">
          Only district admins and ward admins can print district lists.
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>District</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Leader</TableHead>
              <TableHead>Assistant</TableHead>
              <TableHead className="text-right">PDF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground"
                >
                  No districts yet.
                </TableCell>
              </TableRow>
            )}
            {reports.map((report) => {
              const { district, leader, assistant } = report
              return (
                <TableRow key={district.id}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2">
                      {district.color && (
                        <img
                          src={`/images/${district.color}.svg`}
                          alt=""
                          className="h-6 w-auto shrink-0"
                        />
                      )}
                      {district.name}
                    </span>
                  </TableCell>
                  <TableCell>{report.members.length}</TableCell>
                  <TableCell>
                    {leader ? `${leader.familyName}, ${leader.name}` : ''}
                  </TableCell>
                  <TableCell>
                    {assistant
                      ? `${assistant.familyName}, ${assistant.name}`
                      : ''}
                  </TableCell>
                  <TableCell className="text-right">
                    {canPrintOne && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy != null}
                        aria-label={`Download PDF for ${district.name}`}
                        onClick={() =>
                          download(
                            district.id,
                            [report],
                            `${wardPart}-${fileNamePart(district.name ?? '')}.pdf`,
                          )
                        }
                      >
                        <FileDown className="w-4 h-4 mr-2" />
                        {busy === district.id ? 'Creating...' : 'Download PDF'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Maps ©{' '}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          OpenStreetMap contributors
        </a>
        .
      </p>
    </div>
  )
}

export default PrintDistricts
