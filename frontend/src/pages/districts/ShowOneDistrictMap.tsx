import React, { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getDistrict, getMemberList } from '@/api'
import OSMMapWithMarkers from '@/components/OSMMapWithMarkersOneDistrict.tsx'
import { useParams } from 'react-router-dom'
import { District, DistrictDbType } from '@/type'
import { useMap } from 'react-leaflet'
import MemberDisplayName from '@/components/MemberDisplayName.tsx'
import { LatLngBoundsExpression } from 'leaflet'

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
  const { districtId } = useParams()
  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: getMemberList,
  })

  const { data } = useQuery({
    queryKey: ['district', districtId],
    queryFn: () => getDistrict(districtId as string),
    enabled: districtId !== undefined && members !== undefined,
    retry: false,
  })

  const convertDbDistrict = (db?: DistrictDbType): District | undefined => {
    if (!db) {
      return undefined
    }
    return {
      id: db.id,
      name: db.name,
      leader: members?.find((m) => m.id == db.leaderId) ?? {
        id: '0',
        familyName: 'No leader assigned',
        name: 'No leader',
      },
      assistant: members?.find((m) => m.id == db.assistantId),
      color: db.color,
      members: members?.filter((m) => db.members?.includes(m.id)),
    }
  }

  const district = props.district ? props.district : convertDbDistrict(data)

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
