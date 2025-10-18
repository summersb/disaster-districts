import React, { useEffect } from 'react'
import { useMembers } from '@/hooks/useMembers'
import { useDistrict } from '@/hooks/useDistricts'
import OSMMapWithMarkers from '@/components/OSMMapWithMarkersOneDistrict.tsx'
import { useMatch } from '@tanstack/react-router'
import { District } from '@/type'
import { useMap } from 'react-leaflet'
import MemberDisplayName from '@/components/MemberDisplayName.tsx'
import { LatLngBoundsExpression } from 'leaflet'
import { viewDistrictRoute } from '@/routes'

const MapWithBounds = ({ bounds }: { bounds: LatLngBoundsExpression }) => {
  const map = useMap()

  useEffect(() => {
    if (bounds) {
      // Fit the map to the given bounds (southwest and northeast corners)
      map.fitBounds(bounds)
    }
    map.off('resize')
    return () => {
      // @ts-expect-error
      map.on('resize', map._onResize)
    }
  }, [map, bounds])

  return null
}

type ShowOneDistrictMap = {
  district?: District
  showDistrictMarker?: boolean
}

const ShowOneDistrictMap = (props: ShowOneDistrictMap): React.ReactElement => {
  const match = useMatch({ from: viewDistrictRoute })
  const districtId = Number(match?.params?.districtId)
  const { data: members } = useMembers(0 as any)

  const { data: district } = useDistrict(0 as any, districtId)

  const bounds = (d: District) => {
    const distMembers = d.members
    const latitudes = distMembers?.map((m) => m.lat ?? 0) ?? []
    const longitudes = distMembers?.map((m) => m.lng ?? 0) ?? []

    const minLat = Math.min(...latitudes)
    const maxLat = Math.max(...latitudes)
    const minLng = Math.min(...longitudes)
    const maxLng = Math.max(...longitudes)

    return (
      <MapWithBounds
        bounds={[
          [minLat, minLng],
          [maxLat, maxLng],
        ]}
      />
    )
  }

  return (
    <div>
      {district && (district.members?.length ?? 0) > 0 && (
        <div className="print-map">
          <div className="w-full">
            <h1>{district?.name}</h1>
            {district?.leader && (
              <h2>
                Leader: <MemberDisplayName member={district.leader} />
              </h2>
            )}
            {district?.assistant && (
              <h2>
                Assistant: <MemberDisplayName member={district.assistant} />
              </h2>
            )}
          </div>
          <div className="w-[700px] h-[500px]">
            <OSMMapWithMarkers
              showDistrictMarker={props.showDistrictMarker ?? true}
              district={district}
              members={members || []}
              bounds={bounds(district)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default ShowOneDistrictMap
