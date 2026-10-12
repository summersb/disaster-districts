import { useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type React from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import useUser from '@/context/useUser.tsx'
import {
  GEOCODE_BATCH_SIZE,
  type GeocodeMemberResult,
  geocodeMembers,
  type MemberOutlier,
  NoWardCenterError,
  useMemberOutliers,
} from '@/hooks/useMembers'
import { getWardId } from '@/lib/api'
import { canManageUsers } from '@/lib/roles'
import { Route as MapRoute } from '@/routes/_protected/dashboard/map'
import { Route as MemberEditRoute } from '@/routes/_protected/member/$id'
import { Route as MemberRoute } from '@/routes/_protected/member/index'

const KM_PER_MILE = 1.609344
// Matches the ward map's default view, so the two report the same members.
const DEFAULT_RADIUS_MILES = 5

const formatMiles = (km: number) => {
  const miles = km / KM_PER_MILE
  return `${miles >= 100 ? Math.round(miles) : miles.toFixed(1)} mi`
}

const memberAddress = (member: MemberOutlier['member']) =>
  [
    member.address1,
    member.city,
    [member.state, member.postalCode].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(', ') ||
  member.formattedAddress ||
  ''

const ResultStatus = ({ result }: { result: GeocodeMemberResult }) => {
  if (result.status === 'updated') {
    return (
      <span className="text-green-700 dark:text-green-500">
        Updated
        {result.distanceKm != null &&
          ` (${formatMiles(result.distanceKm)} from center)`}
      </span>
    )
  }
  const label = {
    not_found: 'No match found',
    too_far: 'Match is outside the ward area - not changed',
    no_address: 'No address on file',
    failed: `Failed (${result.error ?? 'unknown error'})`,
  }[result.status]
  const tone =
    result.status === 'failed'
      ? 'text-red-600 dark:text-red-400'
      : 'text-yellow-800 dark:text-yellow-500'
  return <span className={tone}>{label}</span>
}

// Finds members whose map pin is missing or nowhere near the ward, and lets a
// ward manager re-derive the selected ones from their address via the
// backend's OpenStreetMap lookup.
const MemberLocations = (): React.ReactElement => {
  const wardId = getWardId()
  const { user } = useUser()
  const canUpdate = canManageUsers(user.roles)
  const queryClient = useQueryClient()

  const [radiusMiles, setRadiusMiles] = useState(String(DEFAULT_RADIUS_MILES))
  const radiusKm = Number(radiusMiles) * KM_PER_MILE
  const validRadius = Number.isFinite(radiusKm) && radiusKm > 0

  const { data, error, isLoading } = useMemberOutliers(
    wardId,
    validRadius ? radiusKm : 0,
  )

  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [results, setResults] = useState<Map<number, GeocodeMemberResult>>(
    new Map(),
  )
  // Once an update has run, keep showing the rows it ran against (with their
  // outcome) instead of the refreshed list, where fixed members have vanished.
  const [frozenRows, setFrozenRows] = useState<MemberOutlier[] | null>(null)
  const [progress, setProgress] = useState<{
    done: number
    total: number
  } | null>(null)

  const rows = frozenRows ?? data?.members ?? []
  const running = progress != null
  // Rows without an address are shown but can't be looked up, so they are
  // never selectable.
  const selectableIds = rows
    .filter((row) => row.hasAddress && !results.has(row.member.id))
    .map((row) => row.member.id)
  const selectedIds = selectableIds.filter((id) => selected.has(id))
  const allSelected =
    selectableIds.length > 0 && selectedIds.length === selectableIds.length

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(selectableIds))
  }

  const handleUpdate = async () => {
    if (selectedIds.length === 0 || !data) return
    setFrozenRows(rows)
    setProgress({ done: 0, total: selectedIds.length })
    const next = new Map(results)
    // Small sequential batches: the server spaces OpenStreetMap lookups one
    // second apart, so this also gives the user steady progress.
    for (let i = 0; i < selectedIds.length; i += GEOCODE_BATCH_SIZE) {
      const batch = selectedIds.slice(i, i + GEOCODE_BATCH_SIZE)
      try {
        const response = await geocodeMembers(wardId, batch, data.radiusKm)
        for (const result of response.results) {
          next.set(result.memberId, result)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        for (const memberId of batch) {
          next.set(memberId, { memberId, status: 'failed', error: message })
        }
      }
      setResults(new Map(next))
      setProgress({
        done: Math.min(i + GEOCODE_BATCH_SIZE, selectedIds.length),
        total: selectedIds.length,
      })
    }
    setSelected(new Set())
    setProgress(null)
    await queryClient.invalidateQueries({ queryKey: ['members'] })
  }

  const handleRecheck = () => {
    setFrozenRows(null)
    setResults(new Map())
    setSelected(new Set())
  }

  const updatedCount = [...results.values()].filter(
    (r) => r.status === 'updated',
  ).length

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Check Member Locations</h1>
        <Button variant="ghost" asChild>
          <Link to={MemberRoute.to}>Back to Members</Link>
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Lists members whose map pin is missing or further from the ward center
        than the distance below. Select the ones to fix and their coordinates
        are looked up again from their address. Members with no address on file
        are listed but can't be selected - edit them to add an address or
        coordinates.
      </p>

      {wardId <= 0 && (
        <p className="text-sm">
          Your account isn't assigned to a ward, so there is no ward center to
          measure from.
        </p>
      )}

      {error instanceof NoWardCenterError && (
        <p className="text-sm" data-testid="no-ward-center">
          This ward has no map center yet.{' '}
          <Link
            to={MapRoute.to}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Open the ward map
          </Link>{' '}
          and use "Set Ward Center", then come back.
        </p>
      )}
      {error && !(error instanceof NoWardCenterError) && (
        <p className="text-sm text-destructive">{error.message}</p>
      )}

      {wardId > 0 && !(error instanceof NoWardCenterError) && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <label className="text-sm font-medium" htmlFor="radiusMiles">
              Flag members further than
              <span className="mt-1 flex items-center gap-2 font-normal">
                <Input
                  id="radiusMiles"
                  type="number"
                  min="0.1"
                  step="any"
                  className="w-24"
                  value={radiusMiles}
                  disabled={running || frozenRows != null}
                  onChange={(e) => setRadiusMiles(e.target.value)}
                />
                miles from the ward center
              </span>
            </label>
            <div className="flex gap-2">
              {frozenRows != null && (
                <Button
                  variant="outline"
                  onClick={handleRecheck}
                  disabled={running}
                >
                  Check Again
                </Button>
              )}
              {canUpdate && (
                <Button
                  onClick={handleUpdate}
                  disabled={running || selectedIds.length === 0}
                >
                  {running
                    ? `Looking up ${progress.done} of ${progress.total}...`
                    : selectedIds.length > 0
                      ? `Update ${selectedIds.length} from OpenStreetMap`
                      : 'Update from OpenStreetMap'}
                </Button>
              )}
            </div>
          </div>

          {!validRadius && (
            <p className="text-sm text-destructive">
              Enter a distance greater than 0.
            </p>
          )}
          {!canUpdate && (
            <p className="text-sm text-muted-foreground">
              Only ward admins can update member locations.
            </p>
          )}
          {results.size > 0 && !running && (
            <p className="text-sm" data-testid="geocode-summary">
              {updatedCount} updated, {results.size - updatedCount} not changed
            </p>
          )}

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
                        if (el) {
                          el.indeterminate =
                            selectedIds.length > 0 && !allSelected
                        }
                      }}
                      disabled={
                        !canUpdate || running || selectableIds.length === 0
                      }
                      onChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Current location</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground"
                    >
                      {isLoading
                        ? 'Checking...'
                        : 'Every member is within this distance of the ward center.'}
                    </TableCell>
                  </TableRow>
                )}
                {rows.map(({ member, reason, distanceKm, hasAddress }) => {
                  const result = results.get(member.id)
                  const name = `${member.familyName}, ${member.name}`
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        {/* No checkbox at all without an address - a disabled one
                            reads as selectable, especially in dark mode. */}
                        {hasAddress && (
                          <input
                            type="checkbox"
                            aria-label={`Select ${name}`}
                            checked={selected.has(member.id)}
                            disabled={!canUpdate || running || !!result}
                            onChange={() => toggle(member.id)}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Link
                          to={MemberEditRoute.to}
                          params={{ id: String(member.id) }}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {name}
                        </Link>
                      </TableCell>
                      <TableCell>{memberAddress(member)}</TableCell>
                      <TableCell>
                        {reason === 'missing' || distanceKm == null
                          ? 'No coordinates'
                          : `${formatMiles(distanceKm)} from center`}
                      </TableCell>
                      <TableCell>
                        {result ? (
                          <ResultStatus result={result} />
                        ) : hasAddress ? (
                          <span className="text-muted-foreground">
                            Needs review
                          </span>
                        ) : (
                          <span className="text-yellow-800 dark:text-yellow-500">
                            No address on file
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Address lookups use{' '}
        <a
          href="https://nominatim.org"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Nominatim
        </a>
        . Location data ©{' '}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          OpenStreetMap contributors
        </a>
        , available under the Open Database License. Lookups are limited to one
        per second, so larger selections take a little while.
      </p>
    </div>
  )
}

export default MemberLocations
