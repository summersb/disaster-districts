import MemberDisplayName from '@/components/MemberDisplayName.tsx'
import OSMMapWithMarkers from '@/components/OSMMapWithMarkersOneDistrict.tsx'
import { useMembers } from '@/hooks/useMembers'
import { getWardId } from '@/lib/api'
import type { District } from '@/type'
import type { LatLngBoundsExpression } from 'leaflet'
import type React from 'react'
import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

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
  const wardId = getWardId()
  const { data: members } = useMembers(wardId)
  const district = props.district

  const getBoundsElement = (d: District) => {
    const distMembers = (members ?? []).filter(
      (m) => m.district?.id === d.id && m.lat != null && m.lng != null
    )
    const latitudes = distMembers.map((m) => m.lat as number)
    const longitudes = distMembers.map((m) => m.lng as number)

    if (latitudes.length === 0 || longitudes.length === 0) {
      return undefined
    }

    const minLat = Math.min(...latitudes)
    const maxLat = Math.max(...latitudes)
    const minLng = Math.min(...longitudes)
    const maxLng = Math.max(...longitudes)

    // Check for valid bounds
    if (!isFinite(minLat) || !isFinite(maxLat) || !isFinite(minLng) || !isFinite(maxLng)) {
      return undefined
    }

    return (
      <MapWithBounds
        bounds={[
          [minLat, minLng],
          [maxLat, maxLng],
        ]}
      />
    )
  }

  const districtMembers = (members ?? []).filter((m) => m.district?.id === district?.id)

  return (
    <div>
      {district && districtMembers.length > 0 && (
        <div className="print-map">
          <div className="w-full">
            <h1>{district.name}</h1>
            {district.leader && (
              <h2>
                Leader: <MemberDisplayName member={district.leader} />
              </h2>
            )}
            {district.assistant && (
              <h2>
                Assistant: <MemberDisplayName member={district.assistant} />
              </h2>
            )}
          </div>
          <div className="w-[700px] h-[500px]">
            <OSMMapWithMarkers
              showDistrictMarker={props.showDistrictMarker ?? true}
              district={district}
              members={districtMembers}
              bounds={getBoundsElement(district)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default ShowOneDistrictMap
