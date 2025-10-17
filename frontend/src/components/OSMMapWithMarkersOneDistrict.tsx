import React from 'react'
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import type { District, Member } from '@/type'
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
  district: District
  members: Member[]
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
    const lats = memberList.map((m) => m?.lat ?? 0)
    const lngs = memberList.map((m) => m?.lng ?? 0)

    const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length
    const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length
    return { lat: avgLat, lng: avgLng }
  }

  const center = findCenter(props.district.members ?? [])

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
      <ChangeView lat={center.lat} lng={center.lng} />
      {deClutter(props.district.members ?? [])?.map((member: Member) => (
        <Marker
          key={member.id}
          position={[member.lat ?? 0, member.lng ?? 0]}
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
