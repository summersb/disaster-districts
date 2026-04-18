import OSMMapWithMarkers from '@/components/OSMMapWithMarkers.tsx'
import { useDistricts } from '@/hooks/useDistricts'
import { useMembers } from '@/hooks/useMembers'
import type { District, Member } from '@/type'
import type React from 'react'

type MapDisplayProps = {
  lat?: number
  lng?: number
  districts?: District[]
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
  const { data, isError, error } = useMembers(0 as any)
  const { data: districts } = useDistricts(0 as any)

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
