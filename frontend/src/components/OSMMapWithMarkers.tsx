import type React from 'react'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Link, useNavigate } from '@tanstack/react-router'
import L from 'leaflet'
import MemberDisplayName from '@/components/MemberDisplayName.tsx'
import { type PlacedPin, spreadOverlappingPins } from '@/components/mapUtils.ts'
import { UNASSIGNED_COLOR } from '@/lib/districtColors'
import { cn } from '@/lib/utils'
import { Route as DistrictRoute } from '@/routes/_protected/district/$id.tsx'
import { Route as MemberLocationsRoute } from '@/routes/_protected/member/locations'
import type { DistrictDto, MemberDto } from '@/type'

type Position = {
  lat: number
  lng: number
}

type ChangeViewProps = {
  center: Position
  members: MemberDto[]
  // Whether `center` was explicitly requested (a district's saved/leader
  // position) rather than just computed as a fallback average. Only the
  // fallback case fits the view to every member's bounding box.
  hasExplicitCenter: boolean
}

function ChangeView({ center, members, hasExplicitCenter }: ChangeViewProps) {
  const map = useMap()
  useEffect(() => {
    if (!hasExplicitCenter) {
      const validMembers = members.filter((m) => m.lat != null && m.lng != null)
      if (validMembers.length > 1) {
        const lats = validMembers.map((m) => m.lat as number)
        const lngs = validMembers.map((m) => m.lng as number)
        map.fitBounds(
          [
            [Math.min(...lats), Math.min(...lngs)],
            [Math.max(...lats), Math.max(...lngs)],
          ],
          { padding: [50, 50] },
        )
        return
      }
    }
    map.setView([center.lat, center.lng], 13)
  }, [map, center, members, hasExplicitCenter])
  return null
}

const MILES_PER_DEGREE_LAT = 69.0

type DefaultRadiusViewProps = {
  center: Position
  radiusMiles: number
  // Bumped by the parent to return to the default view on demand.
  resetCount: number
  // Reports the area the default view actually shows, or null once the user
  // has zoomed or panned away from it.
  onDefaultBounds: (bounds: L.LatLngBounds | null) => void
}

// Default view for a map with a known center: zoomed so the area within
// radiusMiles of the center fills the map, instead of stretching to include
// every member (one stray pin would otherwise zoom the map out to fit it).
function DefaultRadiusView({
  center,
  radiusMiles,
  resetCount,
  onDefaultBounds,
}: DefaultRadiusViewProps) {
  const map = useMap()
  // True while this component is moving the map itself, so those moves
  // aren't mistaken for the user leaving the default view.
  const programmatic = useRef(false)

  // biome-ignore lint/correctness/useExhaustiveDependencies: resetCount is a trigger, and onDefaultBounds is a state setter
  useEffect(() => {
    const dLat = radiusMiles / MILES_PER_DEGREE_LAT
    const dLng =
      radiusMiles /
      (MILES_PER_DEGREE_LAT * Math.cos((center.lat * Math.PI) / 180))
    programmatic.current = true
    map.fitBounds(
      [
        [center.lat - dLat, center.lng - dLng],
        [center.lat + dLat, center.lng + dLng],
      ],
      { animate: false },
    )
    programmatic.current = false
    onDefaultBounds(map.getBounds())
  }, [map, center.lat, center.lng, radiusMiles, resetCount])

  useMapEvents({
    zoomstart() {
      if (!programmatic.current) onDefaultBounds(null)
    },
    dragstart() {
      onDefaultBounds(null)
    },
  })
  return null
}

// Overlapping pins are only moved apart from this zoom level in (roughly a
// neighbourhood-sized view).
const MIN_SPREAD_ZOOM = 14

type MemberPinsProps = {
  members: MemberDto[]
  getIcon: (member: MemberDto) => L.Icon
  onClick: (member: MemberDto) => void
  showLabel: boolean
  editable?: boolean
}

// Draws the member pins. Pins that would cover each other at the current zoom
// are fanned out so each can be clicked, with a line (and a dot) marking where
// the member actually is.
function MemberPins({
  members,
  getIcon,
  onClick,
  showLabel,
  editable,
}: MemberPinsProps) {
  const map = useMap()
  // Overlap depends on the zoom, so re-place the pins whenever it changes.
  const [zoom, setZoom] = useState(map.getZoom())
  useMapEvents({
    zoomend() {
      setZoom(map.getZoom())
    },
  })

  const pins = useMemo<PlacedPin[]>(() => {
    // Zoomed out to the whole ward, pins overlap by the hundred and moving
    // them apart would only add clutter - show them where they are.
    if (zoom < MIN_SPREAD_ZOOM) {
      return members.flatMap((member) =>
        member.lat != null && member.lng != null
          ? [{ member, lat: member.lat, lng: member.lng }]
          : [],
      )
    }
    return spreadOverlappingPins(
      members,
      (point) => map.project([point.lat, point.lng], zoom),
      (pixel) => map.unproject([pixel.x, pixel.y], zoom),
    )
  }, [members, map, zoom])

  return (
    <>
      {pins.map(({ member, lat, lng, actual }) => (
        <Fragment key={member.id}>
          {actual && (
            <>
              <Polyline
                positions={[
                  [actual.lat, actual.lng],
                  [lat, lng],
                ]}
                pathOptions={{ color: '#1f2937', weight: 1.5 }}
                interactive={false}
              />
              <CircleMarker
                center={[actual.lat, actual.lng]}
                radius={3}
                pathOptions={{
                  color: '#1f2937',
                  weight: 1,
                  fillColor: '#ffffff',
                  fillOpacity: 1,
                }}
                interactive={false}
              />
            </>
          )}
          <Marker
            position={[lat, lng]}
            eventHandlers={{ click: () => onClick(member) }}
            icon={getIcon(member)}
          >
            <Tooltip
              direction="right"
              offset={[0, 20]}
              opacity={showLabel ? 0.5 : 1}
              permanent={showLabel}
            >
              <MemberDisplayName member={member} />
              {editable && ' (click to look up address)'}
            </Tooltip>
          </Marker>
        </Fragment>
      ))}
    </>
  )
}

function ClickHandler({
  onClick,
}: {
  onClick: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

type MapWithMarkersProps = {
  districts: DistrictDto[]
  members: MemberDto[]
  center?: Position
  markerClicked?: (member: MemberDto) => void
  onMapClick?: (lat: number, lng: number) => void
  showLabel: boolean
  // When set, clicking a member pin reports the member via onMemberSelected
  // instead of the normal markerClicked/district-assignment behavior, so the
  // caller can offer a way to correct that member's location (e.g. an
  // address lookup).
  editable?: boolean
  onMemberSelected?: (member: MemberDto) => void
  // With a center, open zoomed to roughly this many miles around it rather
  // than fitting every member, and report how many members that leaves out.
  defaultRadiusMiles?: number
  // Set to false to keep the default-radius view without the "N members are
  // not shown" message (e.g. inside a form, where its link would navigate
  // away from unsaved changes).
  showOutsideStatus?: boolean
}

const OSMMapWithMarkers = (props: MapWithMarkersProps): React.ReactElement => {
  const navigate = useNavigate()
  const markerClicked = (member: MemberDto) => {
    if (props.editable) {
      props.onMemberSelected?.(member)
      return
    }
    if (isMemberLocked(member)) return
    if (props.markerClicked) {
      props.markerClicked(member)
    }
  }

  const districtClicked = (district?: DistrictDto) => {
    if (district) {
      navigate({
        to: DistrictRoute.to,
        params: { id: String(district.id) },
      }).catch((err) => console.log(err))
    }
  }

  // Resolve a member's role within any district in the props list. A member
  // can be a leader of one district, assistant of another, or just a regular
  // member of one district. Use leaderId/assistantId from the DTO if present,
  // falling back to the legacy `leader`/`assistant` member objects.
  const findRoleDistrict = (
    member: MemberDto,
  ): { role: 'leader' | 'assistant' | 'member'; color?: string } => {
    const leaderDistrict = props.districts?.find(
      (d) => d.leaderId === member.id || d.leader?.id === member.id,
    )
    if (leaderDistrict) return { role: 'leader', color: leaderDistrict.color }
    const assistantDistrict = props.districts?.find(
      (d) => d.assistantId === member.id || d.assistant?.id === member.id,
    )
    if (assistantDistrict)
      return { role: 'assistant', color: assistantDistrict.color }
    return { role: 'member', color: member.district?.color }
  }

  function getMemberIcon(member: MemberDto): L.Icon {
    const { role, color } = findRoleDistrict(member)
    const colorName = color ?? UNASSIGNED_COLOR
    const prefix =
      role === 'leader' ? 'Leader-' : role === 'assistant' ? 'Assistant-' : ''
    return new L.Icon({
      iconUrl: `/images/${prefix}${colorName}.svg`,
      iconSize: [25, 41], // size of the icon
      iconAnchor: [12, 41], // point of the icon which will correspond to marker's location
      popupAnchor: [1, -34], // point from which the popup should open relative to the iconAnchor
      shadowUrl:
        'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      shadowSize: [41, 41],
    })
  }

  // Members who lead or assist any district can't be moved by clicking.
  const isMemberLocked = (member: MemberDto): boolean => {
    return (
      props.districts?.some(
        (d) =>
          d.leaderId === member.id ||
          d.assistantId === member.id ||
          d.leader?.id === member.id ||
          d.assistant?.id === member.id,
      ) ?? false
    )
  }

  function getGroupIcon(): L.Icon {
    return new L.Icon({
      iconUrl: '/images/Group.svg',
      iconSize: [50, 80], // size of the icon
      iconAnchor: [12, 41], // point of the icon which will correspond to marker's location
      popupAnchor: [1, -34], // point from which the popup should open relative to the iconAnchor
      shadowUrl:
        'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      shadowSize: [41, 41],
    })
  }

  const DEFAULT_CENTER: Position = { lat: 0, lng: 0 }

  const findCenter = (memberList: MemberDto[]): Position => {
    if (memberList.length === 0) return DEFAULT_CENTER
    const latitudes = memberList.map((m) => m.lat ?? 0)
    const longitudes = memberList.map((m) => m.lng ?? 0)

    const avgLat = latitudes.reduce((a, b) => a + b, 0) / latitudes.length
    const avgLng = longitudes.reduce((a, b) => a + b, 0) / longitudes.length
    return { lat: avgLat, lng: avgLng }
  }

  const center = props.center ? props.center : findCenter(props.members)

  const radiusView =
    props.center != null && props.defaultRadiusMiles != null
      ? { center: props.center, radiusMiles: props.defaultRadiusMiles }
      : null
  // The area shown by the default view; null after the user moves the map.
  const [defaultBounds, setDefaultBounds] = useState<L.LatLngBounds | null>(
    null,
  )
  const [resetCount, setResetCount] = useState(0)
  // Members the default view doesn't show: pins outside it, plus members
  // with no coordinates at all.
  const outsideCount = useMemo(() => {
    if (!defaultBounds) return 0
    return props.members.filter(
      (m) =>
        m.lat == null ||
        m.lng == null ||
        !defaultBounds.contains([m.lat, m.lng]),
    ).length
  }, [defaultBounds, props.members])

  return (
    <div
      className={cn(
        'relative h-full w-full',
        // While the caller is waiting for a map click (picking a center),
        // show a crosshair instead of Leaflet's drag hand. Leaflet's own CSS
        // is unlayered, so these need to be !important to win.
        props.onMapClick &&
          '[&_.leaflet-grab]:cursor-crosshair! [&_.leaflet-interactive]:cursor-crosshair!',
      )}
    >
      {radiusView && (
        <div className="absolute bottom-6 left-2 z-[1000] flex items-center gap-2 text-xs">
          {props.showOutsideStatus !== false &&
            defaultBounds &&
            outsideCount > 0 && (
              <span
                className="rounded bg-background/90 px-2 py-1"
                data-testid="members-outside-view"
              >
                {outsideCount} member{outsideCount === 1 ? ' is' : 's are'} not
                shown in this view.{' '}
                <Link
                  to={MemberLocationsRoute.to}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Check locations
                </Link>
              </span>
            )}
          {!defaultBounds && (
            <button
              type="button"
              className="rounded bg-background/90 px-2 py-1 hover:bg-background"
              onClick={() => setResetCount((count) => count + 1)}
            >
              Reset view
            </button>
          )}
        </div>
      )}
      <MapContainer
        center={[center.lat, center.lng]}
        style={{ height: '100%', width: '100%' }}
        zoom={14}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy: <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {radiusView ? (
          <DefaultRadiusView
            center={radiusView.center}
            radiusMiles={radiusView.radiusMiles}
            resetCount={resetCount}
            onDefaultBounds={setDefaultBounds}
          />
        ) : (
          <ChangeView
            center={center}
            members={props.members}
            hasExplicitCenter={props.center != null}
          />
        )}
        {props.onMapClick && <ClickHandler onClick={props.onMapClick} />}
        <MemberPins
          members={props.members}
          getIcon={getMemberIcon}
          onClick={markerClicked}
          showLabel={props.showLabel}
          editable={props.editable}
        />
        {props.districts?.map((d) => {
          // Prefer the district's stored lat/lng. If absent, fall back to the
          // average position of the district's own members.
          const distMembers = (d.members ?? []).filter(
            (m: MemberDto | undefined): m is MemberDto => m != null,
          )
          const districtCenter =
            d.lat != null && d.lng != null
              ? { lat: d.lat, lng: d.lng }
              : distMembers.length > 0
                ? findCenter(distMembers)
                : null
          if (districtCenter == null) return null
          return (
            <Marker
              key={d.id}
              position={[districtCenter.lat, districtCenter.lng]}
              icon={getGroupIcon()}
              eventHandlers={{ click: () => districtClicked(d) }}
            >
              <Tooltip opacity={1} direction="right" offset={[0, 20]} permanent>
                {d.name}
              </Tooltip>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}

export default OSMMapWithMarkers
