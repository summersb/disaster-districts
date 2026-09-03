import type React from 'react'
import { useEffect } from 'react'
import {
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useNavigate } from '@tanstack/react-router'
import L from 'leaflet'
import MemberDisplayName from '@/components/MemberDisplayName.tsx'
import { deClutter } from '@/components/mapUtils.ts'
import { Route as DistrictRoute } from '@/routes/_protected/district/$id.tsx'
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
      (d) => (d as any).leaderId === member.id || d.leader?.id === member.id,
    )
    if (leaderDistrict) return { role: 'leader', color: leaderDistrict.color }
    const assistantDistrict = props.districts?.find(
      (d) =>
        (d as any).assistantId === member.id || d.assistant?.id === member.id,
    )
    if (assistantDistrict)
      return { role: 'assistant', color: assistantDistrict.color }
    return { role: 'member', color: member.district?.color }
  }

  function getMemberIcon(member: MemberDto): L.Icon {
    const { role, color } = findRoleDistrict(member)
    const colorName = color ?? 'Blue'
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
          (d as any).leaderId === member.id ||
          (d as any).assistantId === member.id ||
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

  return (
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
      <ChangeView
        center={center}
        members={props.members}
        hasExplicitCenter={props.center != null}
      />
      {props.onMapClick && <ClickHandler onClick={props.onMapClick} />}
      {deClutter(props.members)?.map((member: MemberDto) => (
        <Marker
          key={member.id}
          position={[member.lat ?? 0, member.lng ?? 0]}
          eventHandlers={{ click: () => markerClicked(member) }}
          icon={getMemberIcon(member)}
        >
          <Tooltip
            direction="right"
            offset={[0, 20]}
            opacity={props.showLabel ? 0.5 : 1}
            permanent={props.showLabel}
          >
            <MemberDisplayName member={member} />
            {props.editable && ' (click to look up address)'}
          </Tooltip>
        </Marker>
      ))}
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
  )
}

export default OSMMapWithMarkers
