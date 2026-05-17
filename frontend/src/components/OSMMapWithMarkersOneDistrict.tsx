import type React from 'react'
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import MemberDisplayName from '@/components/MemberDisplayName.tsx'
import { deClutter } from '@/components/mapUtils.ts'
import type { DistrictDto, MemberDto } from '@/type'

type Position = {
  lat: number
  lng: number
}

type ChangeViewProps = {
  center: Position
  members: MemberDto[]
}

function ChangeView({ center, members }: ChangeViewProps) {
  const map = useMap()

  // Filter members with valid coordinates
  const validMembers = members.filter((m) => m.lat != null && m.lng != null)

  if (validMembers.length > 1) {
    // Calculate bounds from members
    const lats = validMembers.map((m) => m.lat as number)
    const lngs = validMembers.map((m) => m.lng as number)

    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)

    // Fit bounds with padding
    map.fitBounds(
      [
        [minLat, minLng],
        [maxLat, maxLng],
      ],
      { padding: [50, 50] },
    )
  } else {
    // Single member or no members, just set view to center
    map.setView([center.lat, center.lng], 13)
  }
  return null
}

type MapWithMarkersProps = {
  district: DistrictDto
  members: MemberDto[]
  bounds?: React.ReactElement
  showDistrictMarker?: boolean
}

const OSMMapWithMarkers = (props: MapWithMarkersProps): React.ReactElement => {
  function getMemberIcon(): L.Icon {
    const color = props.district.color

    return new L.Icon({
      iconUrl: `/images/${color}.svg`,
      iconSize: [25, 41], // size of the icon
      iconAnchor: [12, 41], // point of the icon which will correspond to marker's location
      popupAnchor: [1, -34], // point from which the popup should open relative to the iconAnchor
      shadowUrl:
        'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      shadowSize: [41, 41],
    })
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

  const findCenter = (memberList: MemberDto[]) => {
    const validMembers = memberList.filter(
      (m) => m.lat != null && m.lng != null,
    )
    if (validMembers.length === 0) {
      return { lat: 33.1928423, lng: -117.2413057 } // Default fallback
    }

    const lats = validMembers.map((m) => m.lat as number)
    const lngs = validMembers.map((m) => m.lng as number)

    const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length
    const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length
    return { lat: avgLat, lng: avgLng }
  }

  const center = findCenter(props.members)

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      style={{ height: '100%', width: '100%' }}
      zoom={15}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy: <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ChangeView center={center} members={props.members} />
      {deClutter(
        props.members.filter((m) => m.lat != null && m.lng != null),
      )?.map((member: MemberDto) => (
        <Marker
          key={member.id}
          position={[member.lat as number, member.lng as number]}
          icon={getMemberIcon()}
        >
          <Tooltip direction="right" offset={[0, 20]} opacity={0.5} permanent>
            <MemberDisplayName member={member} />
          </Tooltip>
        </Marker>
      ))}
      {props.showDistrictMarker && (
        <Marker
          key={props.district.id}
          position={[center.lat, center.lng]}
          icon={getGroupIcon()}
        >
          <Tooltip opacity={1} direction="right" offset={[0, 20]} permanent>
            {props.district.name}
          </Tooltip>
          {props.bounds && props.bounds}
        </Marker>
      )}
    </MapContainer>
  )
}

export default OSMMapWithMarkers
