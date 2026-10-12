import { useNavigate } from '@tanstack/react-router'
import type React from 'react'
import OSMMapWithMarkers from '@/components/OSMMapWithMarkers'
import { Route as MemberEditRoute } from '@/routes/_protected/member/$id'
import type { DistrictDto, MemberDto } from '@/type'

// The view is framed to fit the members shown, with a little margin and
// never closer than a block or so.
const VIEW_MARGIN = 1.3
const MIN_VIEW_RADIUS_MILES = 0.15

const milesBetween = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) =>
  Math.hypot(
    (b.lat - a.lat) * 69,
    (b.lng - a.lng) * 69 * Math.cos((a.lat * Math.PI) / 180),
  )

type DistrictMembersMapProps = {
  districts: DistrictDto[]
  // Only these members are drawn - pass just the districts' own members.
  members: MemberDto[]
}

// A map of one or more districts showing only their members, zoomed to fit
// them. Clicking a pin opens that member.
const DistrictMembersMap = ({
  districts,
  members,
}: DistrictMembersMapProps): React.ReactElement => {
  const navigate = useNavigate()
  const located = members.flatMap((m) =>
    m.lat != null && m.lng != null ? [{ lat: m.lat, lng: m.lng }] : [],
  )
  const center =
    located.length > 0
      ? {
          lat: located.reduce((sum, p) => sum + p.lat, 0) / located.length,
          lng: located.reduce((sum, p) => sum + p.lng, 0) / located.length,
        }
      : undefined
  const radiusMiles = center
    ? Math.max(
        MIN_VIEW_RADIUS_MILES,
        VIEW_MARGIN * Math.max(...located.map((p) => milesBetween(center, p))),
      )
    : undefined

  return (
    <OSMMapWithMarkers
      districts={districts}
      members={members}
      center={center}
      defaultRadiusMiles={radiusMiles}
      showOutsideStatus={false}
      districtLinks={false}
      showLabel
      // The leader's and assistant's own pins are "locked" on the editing
      // maps; here every pin is just a way to open the member.
      editable
      editableHint=""
      onMemberSelected={(member) =>
        navigate({
          to: MemberEditRoute.to,
          params: { id: String(member.id) },
        })
      }
    />
  )
}

export default DistrictMembersMap
