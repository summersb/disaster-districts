import React from 'react'
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import type { DistrictDbType, Member } from '@/type'
import { useNavigate } from 'react-router-dom'
import MemberDisplayName from '@/components/MemberDisplayName.tsx'
import { deClutter } from '@/components/mapUtils.ts'

type Position = {
  lat: number
  lng: number
}

function ChangeView(center: Position) {
  const map = useMap()
  map.setView(center)
  return null
}

type MapWithMarkersProps = {
  districts: DistrictDbType[]
  members: Member[]
  center?: Position
  markerClicked?: (member: Member) => void
  showLabel: boolean
}

const OSMMapWithMarkers = (props: MapWithMarkersProps): React.ReactElement => {
  const navigate = useNavigate()
  const markerClicked = (member: Member) => {
    if (props.markerClicked) {
      props.markerClicked(member)
    }
  }

  const districtClicked = (district?: DistrictDbType) => {
    if (district) {
      navigate(`/district/${district.id}`)
    }
  }

  const getMemberColor = (memberId: string): string => {
    // check if member is leader
    const leaderColor = props.districts?.find(
      (d) => d.leaderId === memberId,
    )?.color
    const color = props.districts?.find((d) =>
      d.members?.includes(memberId),
    )?.color
    return leaderColor ?? color ?? 'Blue'
  }

  function getMemberIcon(member: Member): L.Icon {
    const color = getMemberColor(member.id)

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
      iconUrl: `/images/Group.svg`,
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
        // get average lat/lng for a district
        const distMembers = d.members
          ?.map((mem) => props.members?.find((m) => m.id === mem))
          .filter((m) => m != null)
        if (distMembers == null || distMembers?.length == 0) return null
        const center = findCenter(distMembers)
        return (
          <Marker
            key={d.id}
            position={[center.lat, center.lng]}
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
