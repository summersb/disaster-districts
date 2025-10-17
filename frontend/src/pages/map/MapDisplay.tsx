import { useQuery } from '@tanstack/react-query'
import React from 'react'
import { getDistrictList, getMemberList } from '@/api'
import { DistrictDbType, Member } from '@/type'
import OSMMapWithMarkers from '@/components/OSMMapWithMarkers.tsx'

type MapDisplayProps = {
  lat?: number
  lng?: number
  districts?: DistrictDbType[]
  members?: Member[]
  leader?: Member
  markerClicked?: (member: Member) => void
  showLabel: boolean
}

const MapDisplay = ({
  members,
  lat = 33.1928423,
  lng = -117.2413057,
  markerClicked,
  showLabel,
}: MapDisplayProps): React.ReactElement => {
  const { data, isError, error } = useQuery({
    queryKey: ['members'],
    queryFn: getMemberList,
    retry: false,
  })
  const { data: districts } = useQuery({
    queryKey: ['districts'],
    queryFn: getDistrictList,
  })

  if (isError) {
    alert(error)
  }

  const m = (members ?? data)?.filter((m) => m.lat !== undefined)
  const center = {
    lat: lat ?? 33.19228423,
    lng: lng ?? -17.2413057,
  }
  return (
    <>
      {!districts && <div>Loading</div>}
      {districts && (
        <div className="h-full">
          {m && (
            <OSMMapWithMarkers
              districts={districts}
              members={m}
              center={center}
              markerClicked={markerClicked}
              showLabel={showLabel}
            />
          )}
        </div>
      )}
    </>
  )
}

export default MapDisplay
