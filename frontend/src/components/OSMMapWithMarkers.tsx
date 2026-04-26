import type React from 'react'
import {
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import MemberDisplayName from '@/components/MemberDisplayName.tsx'
import { deClutter } from '@/components/mapUtils.ts'
import { Route as DistrictRoute } from '@/routes/_protected/district/$id.tsx'
import type { District, Member } from '@/type'
import { useNavigate } from '@tanstack/react-router'
import L from 'leaflet'

type Position = {
  lat: number
  lng: number
}

function ChangeView(center: Position) {
  const map = useMap()
  map.setView(center)
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
  districts: District[]
  members: Member[]
  center?: Position
  markerClicked?: (member: Member) => void
  onMapClick?: (lat: number, lng: number) => void
  showLabel: boolean
}

const OSMMapWithMarkers = (props: MapWithMarkersProps): React.ReactElement => {
  const navigate = useNavigate()
  const markerClicked = (member: Member) => {
    if (props.markerClicked) {
      props.markerClicked(member)
    }
  }

  const districtClicked = (district?: District) => {
    if (district) {
      navigate({
        to: DistrictRoute.to,
        params: { id: String(district.id) },
      }).catch((err) => console.log(err))
    }
  }

  const getMemberColor = (member: Member): string => {
    // Prefer the member's own assigned district color (set on the MemberDto).
    // Fall back to scanning the districts prop for one whose leader matches,
    // then to a default. This ensures every district member shows up in the
    // district's color, not just the leader.
    const ownDistrictColor = member.district?.color
    if (ownDistrictColor) return ownDistrictColor
    const leaderColor = props.districts?.find(
      (d) => d.leader?.id === member.id,
    )?.color
    return leaderColor ?? 'Blue'
  }

  function getMemberIcon(member: Member): L.Icon {
    const color = getMemberColor(member)

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

  const findCenter = (memberList: Member[]) => {
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
      <ChangeView lat={center.lat} lng={center.lng} />
      {props.onMapClick && <ClickHandler onClick={props.onMapClick} />}
      {deClutter(props.members)?.map((member: Member) => (
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
          </Tooltip>
        </Marker>
      ))}
      {props.districts?.map((d) => {
        // Prefer the district's stored lat/lng. If absent, fall back to the
        // average position of the district's own members.
        const distMembers = (d.members ?? []).filter(
          (m: Member | undefined): m is Member => m != null,
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
