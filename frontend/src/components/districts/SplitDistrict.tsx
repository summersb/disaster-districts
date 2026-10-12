import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import type React from 'react'
import { useMemo, useState } from 'react'
import { ColorPicker } from '@/components/ColorPicker.tsx'
import OSMMapWithMarkers from '@/components/OSMMapWithMarkers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDistricts } from '@/hooks/useDistricts'
import { useMembers } from '@/hooks/useMembers'
import { authFetch, getWardId } from '@/lib/api'
import { UNASSIGNED_COLOR } from '@/lib/districtColors'
import { Route as DistrictsRoute } from '@/routes/_protected/district/index'
import type { MemberDto } from '@/type'

// The map is framed to fit the district's members, with a little margin and
// never closer than a block or so. Without any located members it falls back
// to the same 1-mile view as editing a district.
const VIEW_MARGIN = 1.3
const MIN_VIEW_RADIUS_MILES = 0.15
const DEFAULT_VIEW_RADIUS_MILES = 1

// Straight-line distance, accurate enough over the few miles a district spans.
const milesBetween = (
  a: { lat: number; lng: number },
  b: { lat?: number | null; lng?: number | null },
) => {
  const dLat = ((b.lat ?? a.lat) - a.lat) * 69
  const dLng =
    ((b.lng ?? a.lng) - a.lng) * 69 * Math.cos((a.lat * Math.PI) / 180)
  return Math.hypot(dLat, dLng)
}

type SplitDistrictProps = {
  districtId: number
}

type MemberPanelProps = {
  title: React.ReactNode
  members: MemberDto[]
  // Members who can't be moved, and why (shown instead of the move button).
  lockedRoles: Map<number, string>
  moveLabel: string
  moveIcon: React.ReactNode
  onMove: (member: MemberDto) => void
  emptyMessage: string
  children?: React.ReactNode
}

const displayName = (member: MemberDto) =>
  `${member.familyName}, ${member.name}`

const byName = (a: MemberDto, b: MemberDto) =>
  displayName(a).localeCompare(displayName(b))

// One side of the split: a heading, optional fields, and its member list.
const MemberPanel = ({
  title,
  members,
  lockedRoles,
  moveLabel,
  moveIcon,
  onMove,
  emptyMessage,
  children,
}: MemberPanelProps) => (
  <section className="flex min-h-0 flex-col rounded-md border p-3">
    <h3 className="mb-2 font-semibold">{title}</h3>
    {children}
    <ul className="min-h-0 flex-1 overflow-y-auto text-sm">
      {members.length === 0 && (
        <li className="py-2 text-muted-foreground">{emptyMessage}</li>
      )}
      {members.map((member) => {
        const role = lockedRoles.get(member.id)
        return (
          <li
            key={member.id}
            className="flex items-center justify-between gap-2 px-2 py-1 odd:bg-muted"
          >
            <span>{displayName(member)}</span>
            {role ? (
              <span className="text-xs text-muted-foreground">{role}</span>
            ) : (
              <Button
                type="button"
                size="xs"
                variant="outline"
                aria-label={`${moveLabel}: ${displayName(member)}`}
                onClick={() => onMove(member)}
              >
                {moveIcon}
              </Button>
            )}
          </li>
        )
      })}
    </ul>
  </section>
)

// Splits one district in two: pick which members move to a new district
// (from either list or by clicking pins on the map), name it, and save. The
// new district is created with those members, which takes them out of the
// original in the same request.
const SplitDistrict = ({
  districtId,
}: SplitDistrictProps): React.ReactElement => {
  const wardId = getWardId()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: districts } = useDistricts(wardId)
  const { data: allMembers = [] } = useMembers(wardId)

  const district = districts?.find((d) => d.id === districtId)

  const [movingIds, setMovingIds] = useState<Set<number>>(new Set())
  const [name, setName] = useState('')
  const [color, setColor] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const members = useMemo(
    () => allMembers.filter((m) => m.district?.id === districtId).sort(byName),
    [allMembers, districtId],
  )

  // The original district keeps its leader and assistant, so they stay put.
  const lockedRoles = useMemo(() => {
    const roles = new Map<number, string>()
    if (district?.leaderId) roles.set(district.leaderId, 'Leader - stays')
    if (district?.assistantId) {
      roles.set(district.assistantId, 'Assistant - stays')
    }
    return roles
  }, [district?.leaderId, district?.assistantId])

  const staying = members.filter((m) => !movingIds.has(m.id))
  const moving = members.filter((m) => movingIds.has(m.id))

  const toggle = (member: MemberDto) => {
    if (lockedRoles.has(member.id)) return
    setMovingIds((prev) => {
      const next = new Set(prev)
      if (next.has(member.id)) next.delete(member.id)
      else next.add(member.id)
      return next
    })
  }

  // Each pin takes the color of the district the member will end up in. Until
  // a color is chosen for the new district its pins use the unassigned color.
  const mapMembers = members.map((m) =>
    movingIds.has(m.id)
      ? {
          ...m,
          district: { id: 0, name, color: color || UNASSIGNED_COLOR },
        }
      : m,
  )

  const located = members.filter((m) => m.lat != null && m.lng != null)
  const average = (list: MemberDto[]) =>
    list.length > 0
      ? {
          lat:
            list.reduce((sum, m) => sum + (m.lat as number), 0) / list.length,
          lng:
            list.reduce((sum, m) => sum + (m.lng as number), 0) / list.length,
        }
      : undefined
  // Frame the map on this district's own members: centered on them and just
  // wide enough to take in the furthest one. (Falls back to the district's
  // saved center when none of them have coordinates.)
  const memberCenter = average(located)
  const center =
    memberCenter ??
    (district?.lat != null && district?.lng != null
      ? { lat: district.lat, lng: district.lng }
      : undefined)
  const viewRadiusMiles = memberCenter
    ? Math.max(
        MIN_VIEW_RADIUS_MILES,
        VIEW_MARGIN *
          Math.max(...located.map((m) => milesBetween(memberCenter, m))),
      )
    : DEFAULT_VIEW_RADIUS_MILES

  const canSave =
    !saving && name.trim() !== '' && color !== '' && moving.length > 0

  const handleSave = async () => {
    setSaving(true)
    setError('')
    // The new district's icon goes in the middle of the members it takes.
    const newCenter = average(
      moving.filter((m) => m.lat != null && m.lng != null),
    )
    try {
      const res = await authFetch(`/api/wards/${wardId}/districts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          color,
          lat: newCenter?.lat,
          lng: newCenter?.lng,
          leaderId: 0,
          assistantId: 0,
          memberIds: moving.map((m) => m.id),
        }),
      })
      if (res.status === 409) {
        throw new Error('A district with that name already exists')
      }
      if (!res.ok) throw new Error(`Split failed: ${res.status}`)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['districts'] }),
        queryClient.invalidateQueries({ queryKey: ['district'] }),
        queryClient.invalidateQueries({ queryKey: ['members'] }),
      ])
      await navigate({ to: DistrictsRoute.to })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Split failed')
    } finally {
      setSaving(false)
    }
  }

  if (districts && !district) {
    return <p className="p-6 text-sm">District not found.</p>
  }

  return (
    // Fills the page: the two districts side by side on the top half, the map
    // on the bottom half.
    <div className="flex h-full flex-col gap-3">
      <div>
        <h2 className="text-xl font-semibold">
          Split District{district ? `: ${district.name}` : ''}
        </h2>
        <p className="text-sm text-muted-foreground">
          Move members to the new district with the arrows, or by clicking their
          pin on the map. Everyone else stays where they are.
        </p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
        <MemberPanel
          title={`${district?.name ?? 'District'} (${staying.length})`}
          members={staying}
          lockedRoles={lockedRoles}
          moveLabel="Move to the new district"
          moveIcon={<ArrowRight className="h-3 w-3" />}
          onMove={toggle}
          emptyMessage="No members would be left in this district."
        />
        <MemberPanel
          title={`New district (${moving.length})`}
          members={moving}
          lockedRoles={lockedRoles}
          moveLabel="Move back"
          moveIcon={<ArrowLeft className="h-3 w-3" />}
          onMove={toggle}
          emptyMessage="No members selected yet."
        >
          <div className="mb-2 flex gap-2">
            <Input
              aria-label="New district name"
              placeholder="New district name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <ColorPicker selectedColor={color} setSelectedColor={setColor} />
          </div>
        </MemberPanel>
      </div>

      <div className="min-h-[240px] flex-1">
        {district && (
          <OSMMapWithMarkers
            districts={[district]}
            members={mapMembers}
            center={center}
            defaultRadiusMiles={center ? viewRadiusMiles : undefined}
            showOutsideStatus={false}
            districtLinks={false}
            markerClicked={toggle}
            showLabel
          />
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        {error && <p className="mr-auto text-sm text-destructive">{error}</p>}
        <Button
          type="button"
          variant="ghost"
          disabled={saving}
          onClick={() => navigate({ to: DistrictsRoute.to })}
        >
          Cancel
        </Button>
        <Button type="button" disabled={!canSave} onClick={handleSave}>
          {saving ? 'Splitting...' : 'Split District'}
        </Button>
      </div>
    </div>
  )
}

export default SplitDistrict
