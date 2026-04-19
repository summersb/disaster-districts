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
  const { data, isError, isLoading } = useMembers(0 as any)
  const { data: districts, isLoading: districtsLoading } = useDistricts(0 as any)

  if (isError) {
    return <div className="p-4 text-destructive">Failed to load members.</div>
  }

  if (isLoading || districtsLoading) {
    return <div className="p-4 text-muted-foreground">Loading...</div>
  }

  const memberList = members ?? data ?? []
  const mapped = memberList.filter((m) => m.lat !== undefined)
  const center = { lat, lng }

  if (!districts) {
    return <div className="p-4 text-muted-foreground">Loading districts...</div>
  }

  if (mapped.length === 0) {
    return (
      <div className="p-4 text-muted-foreground">
        No members with location data to display.
      </div>
    )
  }

  return (
    <div className="h-full">
      <OSMMapWithMarkers
        districts={districts}
        members={mapped}
        center={center}
        markerClicked={markerClicked}
        showLabel={showLabel}
      />
    </div>
  )
}

export default MapDisplay
